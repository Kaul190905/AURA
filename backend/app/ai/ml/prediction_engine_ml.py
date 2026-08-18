import os
from typing import Any, Dict
from uuid import UUID

import joblib
import numpy as np

from app.ai.prediction_engine import RulePredictionEngine
from app.ai.ml.prediction_features import TRAJECTORY_FEATURE_KEYS, build_trajectory_features

from pathlib import Path
_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_MODEL_PATH = os.path.join(
    str(_ROOT), "models", "prediction_model.joblib"
)


class MLPredictionEngine(RulePredictionEngine):
    """
    ML-backed Prediction Engine. Inherits RulePredictionEngine's
    `predict_metric_trend` unchanged (simple linear extrapolation doesn't
    benefit from a trained model the way overload-probability estimation
    does) but replaces `forecast_overload_event`'s heuristic probability
    with a trained regressor over trajectory summary features
    (last value, mean, std, slope, point count).

    Trained offline (see app/ai/ml/training/train_prediction_model.py) —
    "distill" mode bootstraps from RulePredictionEngine's own heuristic with
    no real data required; "live" mode trains on real OverloadEvent rows
    once enough volume exists.
    """

    def __init__(
        self,
        model_path: str = DEFAULT_MODEL_PATH,
        model: Any = None,
        scaler: Any = None,
        **kwargs,
    ):
        super().__init__(**kwargs)

        if model is not None and scaler is not None:
            self.model = model
            self.scaler = scaler
        else:
            if not os.path.exists(model_path):
                raise FileNotFoundError(
                    f"No trained prediction model found at {model_path}. "
                    "Run `python -m app.ai.ml.training.train_prediction_model` first."
                )
            artifact = joblib.load(model_path)
            self.model = artifact["model"]
            self.scaler = artifact["scaler"]

    async def forecast_overload_event(self, user_id: UUID, current_trajectory: Dict[str, Any]) -> Dict[str, Any]:
        risk_scores = [v for v in (current_trajectory.get("risk_scores") or []) if v is not None]

        if not risk_scores:
            return {
                "overload_probability": 0.0,
                "estimated_minutes_to_event": None,
                "trend": "stable",
                "method": "MLPredictionEngine",
            }

        feats = build_trajectory_features(risk_scores)
        vector = np.array([[feats[k] for k in TRAJECTORY_FEATURE_KEYS]], dtype=float)
        scaled = self.scaler.transform(vector)

        raw_probability = float(self.model.predict(scaled)[0])
        probability = round(min(max(raw_probability, 0.0), 1.0), 3)

        slope = feats["slope"]
        return {
            "overload_probability": probability,
            "estimated_minutes_to_event": self._estimate_eta_minutes(risk_scores, slope),
            "trend": self._trend_label(slope),
            "method": "MLPredictionEngine",
        }
