import os
from typing import Any, Dict
from uuid import UUID

import joblib
import numpy as np

from app.ai.prediction_engine import RulePredictionEngine
import torch
import torch.nn as nn

class LSTMRegressor(nn.Module):
    def __init__(self, input_size=1, hidden_size=32, num_layers=1):
        super(LSTMRegressor, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "artifacts", "prediction_model.joblib"
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
            # Load PyTorch model weights
            self.model = LSTMRegressor(1, 32, 1)
            self.model.load_state_dict(artifact["model_state"])
            self.model.eval()
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

        # Sequence padding/truncation for LSTM (fixed length 15)
        seq = risk_scores[-15:]
        if len(seq) < 15:
            seq = [0.0] * (15 - len(seq)) + seq
            
        vector = np.array(seq, dtype=float).reshape(-1, 1)
        scaled = self.scaler.transform(vector)
        
        # Inference with PyTorch
        with torch.no_grad():
            tensor_seq = torch.FloatTensor(scaled).unsqueeze(0) # (1, 15, 1)
            raw_probability = float(self.model(tensor_seq).item())

        probability = round(min(max(raw_probability, 0.0), 1.0), 3)

        # Still calculate slope for heuristic ETA
        slope = self._fit_slope(risk_scores)
        return {
            "overload_probability": probability,
            "estimated_minutes_to_event": self._estimate_eta_minutes(risk_scores, slope),
            "trend": self._trend_label(slope),
            "method": "MLPredictionEngine",
        }
