import os
from typing import Any, Dict
from uuid import UUID

import joblib
import numpy as np

from app.ai.wellness_engine import RuleWellnessEngine
from app.ai.ml.wellness_features import WELLNESS_FEATURE_KEYS, build_wellness_feature_dict

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "artifacts", "wellness_model.joblib"
)


class MLWellnessEngine(RuleWellnessEngine):
    """
    ML-backed Wellness Engine. Inherits RuleWellnessEngine's signal-gathering
    (_build_snapshot) and category breakdown (physical/mental/stability stay
    deterministic and interpretable) but replaces the fixed-weight overall
    score with a trained regressor mapping (risk_score, anomaly_rate,
    recent_mood_avg) -> the score a user would likely self-report.

    Trained offline (see app/ai/ml/training/train_wellness_model.py) —
    "distill" mode bootstraps from RuleWellnessEngine's own formula with no
    real check-ins required; "live" mode trains on real WellnessCheckin data
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
                    f"No trained wellness model found at {model_path}. "
                    "Run `python -m app.ai.ml.training.train_wellness_model` first."
                )
            artifact = joblib.load(model_path)
            self.model = artifact["model"]
            self.scaler = artifact["scaler"]

    async def calculate_wellness_score(self, user_id: UUID, data_snapshot: Dict[str, Any]) -> int:
        feats = build_wellness_feature_dict(data_snapshot, self.neutral_mood_default)
        vector = np.array([[feats[k] for k in WELLNESS_FEATURE_KEYS]], dtype=float)
        scaled = self.scaler.transform(vector)

        raw_score = float(self.model.predict(scaled)[0])
        return int(round(max(0.0, min(100.0, raw_score))))
