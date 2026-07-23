"""
Offline training script for the ML-backed RiskEngine.

Two modes:

  distill  (default) — generates synthetic telemetry/preference samples
                        across realistic ranges and labels them with the
                        existing rule-based RiskEngine. Produces a working
                        model with zero real user data, purely to validate
                        the feature -> model -> serving pipeline end-to-end.
                        This is a *bootstrap*, not real ground truth.

  live     — trains against real, user-confirmed alert outcomes pulled from
             the database (see the /alerts/{id}/feedback endpoint). Falls
             back to `distill` automatically if there isn't enough confirmed
             data yet (see MIN_LIVE_SAMPLES).

Usage:
    python -m app.ai.ml.training.train_risk_model --mode distill
    python -m app.ai.ml.training.train_risk_model --mode live
"""
import argparse
import asyncio
import json
import logging
import os
import random
from datetime import datetime, timezone
from typing import Any, Dict, Tuple

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from app.ai.ml.risk_features import RISK_FEATURE_KEYS, build_risk_feature_dict
from app.ai.risk_engine import RiskEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_risk_model")

ARTIFACT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "artifacts")
MODEL_PATH = os.path.join(ARTIFACT_DIR, "risk_model.joblib")
METADATA_PATH = os.path.join(ARTIFACT_DIR, "risk_model_metadata.json")

MIN_LIVE_SAMPLES = 200


def _random_sample() -> Tuple[Dict[str, Any], Dict[str, Any]]:
    telemetry = {
        "heart_rate": random.uniform(45, 190),
        "temperature": random.uniform(5, 45),
        "noise": random.uniform(20, 130),
        "blood_oxygen": random.uniform(85, 100),
    }
    preferences = {
        "preferred_temperature": random.uniform(18, 26),
        "preferred_noise": random.uniform(40, 70),
    }
    return telemetry, preferences


async def _generate_distilled_dataset(n_samples: int = 6000) -> Tuple[np.ndarray, np.ndarray]:
    rule_engine = RiskEngine()
    X, y = [], []
    for _ in range(n_samples):
        telemetry, preferences = _random_sample()
        result = await rule_engine.evaluate_current_risk(telemetry, preferences)
        feats = build_risk_feature_dict(telemetry, preferences)
        X.append([feats[k] for k in RISK_FEATURE_KEYS])
        y.append(result["risk_score"])
    return np.array(X), np.array(y)


async def _load_live_dataset() -> Tuple[np.ndarray, np.ndarray]:
    """
    Build a training set from real sensor_data rows matched to confirmed
    alerts. Confirmed-accurate HIGH alerts anchor the label near 85; alerts
    the user dismissed as false positives anchor near 40. Coarse, but a real
    supervisory signal instead of a rule-engine echo.
    """
    from sqlalchemy import select
    from app.db.database import AsyncSessionLocal
    from app.domain.models.alert import Alert
    from app.domain.models.sensor_data import SensorData
    from app.domain.models.user_preference import UserPreference

    X, y = [], []
    async with AsyncSessionLocal() as session:
        stmt = select(Alert).where(Alert.user_confirmed.isnot(None))
        confirmed_alerts = (await session.execute(stmt)).scalars().all()

        for alert in confirmed_alerts:
            prefs_stmt = select(UserPreference).where(UserPreference.user_id == alert.user_id)
            prefs_row = (await session.execute(prefs_stmt)).scalars().first()
            preferences = {
                "preferred_temperature": getattr(prefs_row, "preferred_temperature", None),
                "preferred_noise": getattr(prefs_row, "preferred_noise", None),
            }

            sensor_stmt = (
                select(SensorData)
                .where(SensorData.user_id == alert.user_id)
                .where(SensorData.created_at <= alert.created_at)
                .order_by(SensorData.created_at.desc())
                .limit(1)
            )
            sensor_row = (await session.execute(sensor_stmt)).scalars().first()
            if sensor_row is None:
                continue

            telemetry = {
                "heart_rate": sensor_row.heart_rate,
                "temperature": sensor_row.temperature,
                "noise": sensor_row.noise,
                "blood_oxygen": sensor_row.blood_oxygen,
            }
            feats = build_risk_feature_dict(telemetry, preferences)
            label = 85.0 if alert.user_confirmed else 40.0
            X.append([feats[k] for k in RISK_FEATURE_KEYS])
            y.append(label)

    return np.array(X), np.array(y)


async def train(mode: str) -> None:
    if mode == "live":
        X, y = await _load_live_dataset()
        if len(X) < MIN_LIVE_SAMPLES:
            logger.warning(
                "Only %d confirmed samples found (need >= %d) — falling back to distilled bootstrap.",
                len(X), MIN_LIVE_SAMPLES,
            )
            X, y = await _generate_distilled_dataset()
            mode = "distill (fallback from live)"
    else:
        X, y = await _generate_distilled_dataset()

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = GradientBoostingRegressor(
        random_state=42, n_estimators=150, max_depth=3, learning_rate=0.1
    )
    model.fit(X_train_scaled, y_train)

    mae = mean_absolute_error(y_test, model.predict(X_test_scaled))
    logger.info("Trained on %d samples (mode=%s). Test MAE: %.2f", len(X), mode, mae)

    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    joblib.dump({"model": model, "scaler": scaler}, MODEL_PATH)

    metadata = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "n_samples": len(X),
        "test_mae": round(float(mae), 3),
        "feature_keys": RISK_FEATURE_KEYS,
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Saved model to %s", MODEL_PATH)


def main():
    parser = argparse.ArgumentParser(description="Train the ML RiskEngine model.")
    parser.add_argument("--mode", choices=["distill", "live"], default="distill")
    args = parser.parse_args()
    asyncio.run(train(args.mode))


if __name__ == "__main__":
    main()
