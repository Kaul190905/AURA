import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

import joblib
import numpy as np

from app.ai.risk_engine import IRiskEngine
from app.ai.ml.risk_features import RISK_FEATURE_KEYS, build_risk_feature_dict
from app.repositories.sensor_data_repository import SensorDataRepository

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "artifacts", "risk_model.joblib"
)

# Calm/neutral baseline used to weight feature importances into per-prediction
# reasons. This is an approximation of explainability (importance * deviation
# from a calm baseline), not true SHAP — chosen to avoid pulling in a heavy
# `shap` dependency for a single-model use case.
_BASELINE = {
    "heart_rate": 70.0,
    "temperature": 22.0,
    "noise": 55.0,
    "blood_oxygen": 98.0,
    "temp_deviation": 0.0,
    "noise_deviation": 0.0,
}

_REASON_TEMPLATES = {
    "heart_rate": lambda v: f"Elevated heart rate ({v:.0f} bpm).",
    "temp_deviation": lambda v: f"Temperature deviates from preferred by {v:.1f}°C.",
    "noise_deviation": lambda v: f"Noise level deviates from preferred by {v:.1f} dB.",
    "blood_oxygen": lambda v: f"Blood oxygen level of {v:.0f}% is notable.",
    "noise": lambda v: f"Ambient noise at {v:.0f} dB.",
    "temperature": lambda v: f"Ambient temperature at {v:.0f}°C.",
}


class MLRiskEngine(IRiskEngine):
    """
    Gradient-boosted regression model predicting the 0-100 risk score,
    replacing RiskEngine's hand-tuned formula.

    The model is trained offline (see app/ai/ml/training/train_risk_model.py)
    and loaded from a joblib artifact — or injected directly via `model=`/
    `scaler=` for testing. Reasons are approximated from global feature
    importances weighted by each feature's deviation from a calm baseline.
    """

    def __init__(
        self,
        model_path: str = DEFAULT_MODEL_PATH,
        sensor_data_repo: Optional[SensorDataRepository] = None,
        model: Any = None,
        scaler: Any = None,
    ):
        self.sensor_data_repo = sensor_data_repo

        if model is not None and scaler is not None:
            self.model = model
            self.scaler = scaler
        else:
            if not os.path.exists(model_path):
                raise FileNotFoundError(
                    f"No trained risk model found at {model_path}. "
                    "Run `python -m app.ai.ml.training.train_risk_model` first."
                )
            artifact = joblib.load(model_path)
            self.model = artifact["model"]
            self.scaler = artifact["scaler"]

    @staticmethod
    def _determine_level(score: float) -> str:
        if score < 34:
            return "LOW"
        elif score < 67:
            return "MEDIUM"
        return "HIGH"

    async def evaluate_current_risk(self, telemetry: Dict[str, Any], preferences: Dict[str, Any]) -> Dict[str, Any]:
        feats = build_risk_feature_dict(telemetry, preferences)
        vector = np.array([[feats[k] for k in RISK_FEATURE_KEYS]], dtype=float)
        scaled = self.scaler.transform(vector)

        raw_score = float(self.model.predict(scaled)[0])
        score = round(min(max(raw_score, 0.0), 100.0), 1)
        risk_level = self._determine_level(score)
        reasons = self._explain(feats)

        if score == 0.0 and not reasons:
            reasons.append("All metrics are within optimal and preferred ranges.")

        return {"risk_score": score, "risk_level": risk_level, "reasons": reasons}

    def _explain(self, feats: Dict[str, float], top_n: int = 3) -> List[str]:
        importances = getattr(self.model, "feature_importances_", None)
        if importances is None:
            return []

        contributions = [
            (key, importances[idx] * abs(feats[key] - _BASELINE.get(key, 0.0)))
            for idx, key in enumerate(RISK_FEATURE_KEYS)
        ]
        contributions.sort(key=lambda c: c[1], reverse=True)

        reasons = []
        for key, contribution in contributions[:top_n]:
            if contribution <= 0.01:
                continue
            reasons.append(_REASON_TEMPLATES[key](feats[key]))

        return reasons

    async def analyze_historical_risk(self, user_id: UUID, time_window_days: int) -> Dict[str, Any]:
        if self.sensor_data_repo is None:
            raise RuntimeError(
                "MLRiskEngine.analyze_historical_risk requires a sensor_data_repo."
            )

        start_date = datetime.now(timezone.utc) - timedelta(days=time_window_days)
        records = await self.sensor_data_repo.get_history(
            user_id=user_id, start_date=start_date, skip=0, limit=1000, sort_by="asc"
        )

        if not records:
            return {"status": "no_data", "time_window_days": time_window_days}

        scores = []
        for r in records:
            telemetry = {
                "heart_rate": r.heart_rate,
                "temperature": r.temperature,
                "noise": r.noise,
                "blood_oxygen": r.blood_oxygen,
            }
            # NOTE: preferences are intentionally left empty here (defaults apply) —
            # a user's baseline may have changed over the window, and re-fetching
            # historical preference snapshots isn't tracked by the schema today.
            result = await self.evaluate_current_risk(telemetry, {})
            scores.append(result["risk_score"])

        scores_arr = np.array(scores)
        x = np.arange(len(scores_arr))
        slope = float(np.polyfit(x, scores_arr, 1)[0]) if len(scores_arr) > 1 else 0.0

        if slope > 0.5:
            trend = "increasing"
        elif slope < -0.5:
            trend = "decreasing"
        else:
            trend = "stable"

        return {
            "status": "ok",
            "time_window_days": time_window_days,
            "samples_analyzed": len(scores_arr),
            "avg_risk_score": round(float(scores_arr.mean()), 1),
            "max_risk_score": round(float(scores_arr.max()), 1),
            "min_risk_score": round(float(scores_arr.min()), 1),
            "trend_slope": round(slope, 3),
            "trend": trend,
        }
