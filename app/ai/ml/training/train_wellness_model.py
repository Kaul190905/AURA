"""
Offline training script for the ML-backed WellnessEngine.

Two modes:

  distill (default) — bootstraps from RuleWellnessEngine's deterministic
                       formula across synthetic (risk_score, anomaly_rate,
                       recent_mood_avg) combinations. Validates the
                       feature -> model -> serving pipeline with zero real
                       check-in data. This is a *bootstrap*, not real
                       ground truth.

  live               — trains against real WellnessCheckin.mood_score
                        values, paired with that day's risk score
                        (RiskEngine) and anomaly rate (pattern engine)
                        computed from the user's sensor history leading up
                        to the check-in, plus their own prior check-in
                        average as a lag feature. Falls back to `distill`
                        if there aren't enough real check-ins yet (see
                        MIN_LIVE_SAMPLES).

Usage:
    python -m app.ai.ml.training.train_wellness_model --mode distill
    python -m app.ai.ml.training.train_wellness_model --mode live
"""
import argparse
import asyncio
import json
import logging
import os
import random
from datetime import datetime, timezone
from typing import Tuple

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from app.ai.wellness_engine import RuleWellnessEngine
from app.ai.ml.wellness_features import WELLNESS_FEATURE_KEYS, build_wellness_feature_dict

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_wellness_model")

ARTIFACT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "artifacts")
MODEL_PATH = os.path.join(ARTIFACT_DIR, "wellness_model.joblib")
METADATA_PATH = os.path.join(ARTIFACT_DIR, "wellness_model_metadata.json")

MIN_LIVE_SAMPLES = 100


async def _generate_distilled_dataset(n_samples: int = 4000) -> Tuple[np.ndarray, np.ndarray]:
    rule_engine = RuleWellnessEngine()
    X, y = [], []
    for _ in range(n_samples):
        risk_score = random.uniform(0, 100)
        anomaly_rate = random.uniform(0, 1)
        recent_mood_avg = random.choice([None, random.uniform(0, 100)])
        snapshot = {
            "risk_score": risk_score,
            "anomaly_rate": anomaly_rate,
            "recent_mood_avg": recent_mood_avg,
        }
        label = await rule_engine.calculate_wellness_score(None, snapshot)
        feats = build_wellness_feature_dict(snapshot)
        X.append([feats[k] for k in WELLNESS_FEATURE_KEYS])
        y.append(label)
    return np.array(X), np.array(y)


async def _load_live_dataset() -> Tuple[np.ndarray, np.ndarray]:
    """
    For each real check-in, build features from:
      - risk_score: computed from the user's most recent sensor reading
        before the check-in, via the rule-based RiskEngine
      - anomaly_rate: computed via MLPatternEngine over the 50 readings
        preceding the check-in
      - recent_mood_avg: the user's own prior check-in average (a lag
        feature — never the current check-in itself, to avoid leaking
        the label into the features)
    Label: the check-in's own mood_score.
    """
    from sqlalchemy import select
    from app.db.database import AsyncSessionLocal
    from app.domain.models.wellness_checkin import WellnessCheckin
    from app.domain.models.sensor_data import SensorData
    from app.domain.models.user_preference import UserPreference
    from app.ai.risk_engine import RiskEngine
    from app.ai.ml.pattern_engine_ml import MLPatternEngine

    rule_risk_engine = RiskEngine()
    pattern_engine = MLPatternEngine(min_samples_for_model=20)
    X, y = [], []

    async with AsyncSessionLocal() as session:
        checkins = (await session.execute(select(WellnessCheckin))).scalars().all()

        for checkin in checkins:
            prefs_row = (
                await session.execute(
                    select(UserPreference).where(UserPreference.user_id == checkin.user_id)
                )
            ).scalars().first()
            preferences = {
                "preferred_temperature": getattr(prefs_row, "preferred_temperature", None),
                "preferred_noise": getattr(prefs_row, "preferred_noise", None),
            }

            sensor_stmt = (
                select(SensorData)
                .where(SensorData.user_id == checkin.user_id)
                .where(SensorData.created_at <= checkin.created_at)
                .order_by(SensorData.created_at.desc())
                .limit(50)
            )
            sensor_rows = (await session.execute(sensor_stmt)).scalars().all()
            if not sensor_rows:
                continue

            latest = sensor_rows[0]
            telemetry = {
                "heart_rate": latest.heart_rate,
                "temperature": latest.temperature,
                "noise": latest.noise,
                "blood_oxygen": latest.blood_oxygen,
            }
            risk_result = await rule_risk_engine.evaluate_current_risk(telemetry, preferences)

            telemetry_window = [
                {
                    "heart_rate": r.heart_rate,
                    "temperature": r.temperature,
                    "noise": r.noise,
                    "blood_oxygen": r.blood_oxygen,
                }
                for r in sensor_rows
            ]
            anomalies = await pattern_engine.detect_anomalies(checkin.user_id, telemetry_window)
            anomaly_rate = (
                sum(1 for a in anomalies if a["is_anomaly"]) / len(anomalies) if anomalies else 0.0
            )

            prior_stmt = (
                select(WellnessCheckin)
                .where(WellnessCheckin.user_id == checkin.user_id)
                .where(WellnessCheckin.created_at < checkin.created_at)
                .order_by(WellnessCheckin.created_at.desc())
                .limit(7)
            )
            prior_checkins = (await session.execute(prior_stmt)).scalars().all()
            recent_mood_avg = (
                sum(c.mood_score for c in prior_checkins) / len(prior_checkins)
                if prior_checkins
                else None
            )

            snapshot = {
                "risk_score": risk_result["risk_score"],
                "anomaly_rate": anomaly_rate,
                "recent_mood_avg": recent_mood_avg,
            }
            feats = build_wellness_feature_dict(snapshot)
            X.append([feats[k] for k in WELLNESS_FEATURE_KEYS])
            y.append(checkin.mood_score)

    return np.array(X), np.array(y)


async def train(mode: str) -> None:
    if mode == "live":
        X, y = await _load_live_dataset()
        if len(X) < MIN_LIVE_SAMPLES:
            logger.warning(
                "Only %d real check-ins usable (need >= %d) — falling back to distilled bootstrap.",
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
        "feature_keys": WELLNESS_FEATURE_KEYS,
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Saved model to %s", MODEL_PATH)


def main():
    parser = argparse.ArgumentParser(description="Train the ML WellnessEngine model.")
    parser.add_argument("--mode", choices=["distill", "live"], default="distill")
    args = parser.parse_args()
    asyncio.run(train(args.mode))


if __name__ == "__main__":
    main()
