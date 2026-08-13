"""
Offline training script for the ML-backed PredictionEngine.

Two modes:

  distill (default) — generates synthetic risk-score trajectories (varying
                       length, slope, and noise) and labels them using
                       RulePredictionEngine's own heuristic. Validates the
                       feature -> model -> serving pipeline with zero real
                       overload events. This is a *bootstrap*, not real
                       ground truth.

  live               — trains on real OverloadEvent rows: for each logged
                        event, the risk-score trajectory in the preceding
                        window is a positive example (label near 1.0);
                        trajectories sampled from times with no nearby event
                        are negative examples (label near 0.0). Falls back
                        to `distill` if there aren't enough logged events
                        yet (see MIN_LIVE_SAMPLES).

Usage:
    python -m app.ai.ml.training.train_prediction_model --mode distill
    python -m app.ai.ml.training.train_prediction_model --mode live
"""
import argparse
import asyncio
import json
import logging
import os
import random
from datetime import datetime, timedelta, timezone
from typing import Tuple

import joblib
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from app.ai.prediction_engine import RulePredictionEngine

class LSTMRegressor(nn.Module):
    def __init__(self, input_size=1, hidden_size=32, num_layers=1):
        super(LSTMRegressor, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_prediction_model")

ARTIFACT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "artifacts")
MODEL_PATH = os.path.join(ARTIFACT_DIR, "prediction_model.joblib")
METADATA_PATH = os.path.join(ARTIFACT_DIR, "prediction_model_metadata.json")

MIN_LIVE_SAMPLES = 100


def _random_trajectory() -> list:
    length = random.randint(3, 15)
    start = random.uniform(0, 100)
    slope = random.uniform(-8, 8)
    noise_scale = random.uniform(0, 6)
    return [
        max(0.0, min(100.0, start + slope * i + random.gauss(0, noise_scale)))
        for i in range(length)
    ]


async def _generate_distilled_dataset(n_samples: int = 6000) -> Tuple[np.ndarray, np.ndarray]:
    teacher = RulePredictionEngine()
    X, y = [], []
    for _ in range(n_samples):
        trajectory = _random_trajectory()
        result = await teacher.forecast_overload_event(None, {"risk_scores": trajectory})
        seq = trajectory[-15:]
        if len(seq) < 15:
            seq = [0.0] * (15 - len(seq)) + seq
        X.append(seq)
        y.append(result["overload_probability"])
    return np.array(X), np.array(y)


async def _load_live_dataset(window_size: int = 10) -> Tuple[np.ndarray, np.ndarray]:
    """
    Positive examples: the risk-score trajectory of the `window_size`
    sensor readings immediately preceding a logged OverloadEvent, labeled
    1.0. Negative examples: an equal number of trajectories sampled from
    random points in each user's history that are NOT immediately followed
    by a logged event, labeled 0.0.
    """
    from sqlalchemy import select
    from app.db.database import AsyncSessionLocal
    from app.domain.models.overload_event import OverloadEvent
    from app.domain.models.sensor_data import SensorData
    from app.domain.models.user_preference import UserPreference
    from app.ai.risk_engine import RiskEngine

    rule_risk_engine = RiskEngine()
    X, y = [], []

    async with AsyncSessionLocal() as session:
        events = (await session.execute(select(OverloadEvent))).scalars().all()

        for event in events:
            prefs_row = (
                await session.execute(
                    select(UserPreference).where(UserPreference.user_id == event.user_id)
                )
            ).scalars().first()
            preferences = {
                "preferred_temperature": getattr(prefs_row, "preferred_temperature", None),
                "preferred_noise": getattr(prefs_row, "preferred_noise", None),
            }

            sensor_stmt = (
                select(SensorData)
                .where(SensorData.user_id == event.user_id)
                .where(SensorData.created_at <= event.created_at)
                .order_by(SensorData.created_at.desc())
                .limit(window_size)
            )
            sensor_rows = list(reversed((await session.execute(sensor_stmt)).scalars().all()))
            if len(sensor_rows) < 2:
                continue

            risk_scores = []
            for row in sensor_rows:
                telemetry = {
                    "heart_rate": row.heart_rate, "temperature": row.temperature,
                    "noise": row.noise, "blood_oxygen": row.blood_oxygen,
                }
                result = await rule_risk_engine.evaluate_current_risk(telemetry, preferences)
                risk_scores.append(result["risk_score"])

            seq = risk_scores[-15:]
            if len(seq) < 15:
                seq = [0.0] * (15 - len(seq)) + seq
            X.append(seq)
            y.append(1.0)

            # Negative example: a window from well before this event (>= 2h earlier),
            # assumed not to be immediately followed by an overload.
            negative_cutoff = event.created_at - timedelta(hours=2)
            negative_stmt = (
                select(SensorData)
                .where(SensorData.user_id == event.user_id)
                .where(SensorData.created_at <= negative_cutoff)
                .order_by(SensorData.created_at.desc())
                .limit(window_size)
            )
            negative_rows = list(reversed((await session.execute(negative_stmt)).scalars().all()))
            if len(negative_rows) < 2:
                continue

            negative_scores = []
            for row in negative_rows:
                telemetry = {
                    "heart_rate": row.heart_rate, "temperature": row.temperature,
                    "noise": row.noise, "blood_oxygen": row.blood_oxygen,
                }
                result = await rule_risk_engine.evaluate_current_risk(telemetry, preferences)
                negative_scores.append(result["risk_score"])

            seq = negative_scores[-15:]
            if len(seq) < 15:
                seq = [0.0] * (15 - len(seq)) + seq
            X.append(seq)
            y.append(0.0)

    return np.array(X), np.array(y)


async def train(mode: str) -> None:
    if mode == "live":
        X, y = await _load_live_dataset()
        if len(X) < MIN_LIVE_SAMPLES:
            logger.warning(
                "Only %d live samples usable (need >= %d) — falling back to distilled bootstrap.",
                len(X), MIN_LIVE_SAMPLES,
            )
            X, y = await _generate_distilled_dataset()
            mode = "distill (fallback from live)"
    else:
        X, y = await _generate_distilled_dataset()

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Scaling (scale each sequence element as if it were a flat feature, or scale all raw scores together)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train.reshape(-1, 1)).reshape(X_train.shape[0], X_train.shape[1], 1)
    X_test_scaled = scaler.transform(X_test.reshape(-1, 1)).reshape(X_test.shape[0], X_test.shape[1], 1)

    # PyTorch setup
    model = LSTMRegressor(1, 32, 1)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)

    train_ds = TensorDataset(torch.FloatTensor(X_train_scaled), torch.FloatTensor(y_train).unsqueeze(1))
    train_dl = DataLoader(train_ds, batch_size=64, shuffle=True)

    # Training loop
    model.train()
    for epoch in range(10):
        for batch_x, batch_y in train_dl:
            optimizer.zero_grad()
            out = model(batch_x)
            loss = criterion(out, batch_y)
            loss.backward()
            optimizer.step()

    # Evaluation
    model.eval()
    with torch.no_grad():
        test_preds = model(torch.FloatTensor(X_test_scaled)).squeeze(1).numpy()
    
    mae = np.mean(np.abs(test_preds - y_test))
    logger.info("Trained on %d samples (mode=%s). Test MAE: %.3f", len(X), mode, mae)

    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    joblib.dump({"model_state": model.state_dict(), "scaler": scaler}, MODEL_PATH)

    metadata = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "n_samples": len(X),
        "test_mae": round(float(mae), 4),
        "architecture": "LSTM",
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Saved model to %s", MODEL_PATH)


def main():
    parser = argparse.ArgumentParser(description="Train the ML PredictionEngine model.")
    parser.add_argument("--mode", choices=["distill", "live"], default="distill")
    args = parser.parse_args()
    asyncio.run(train(args.mode))


if __name__ == "__main__":
    main()
