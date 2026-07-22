from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from uuid import UUID

import numpy as np

class IPredictionEngine(ABC):
    """
    Interface for the Prediction Engine.
    Handles forecasting future health states or events using predictive modeling.
    """

    @abstractmethod
    async def forecast_overload_event(self, user_id: UUID, current_trajectory: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict the likelihood and estimated time of a sensory or cognitive overload event.
        """
        pass

    @abstractmethod
    async def predict_metric_trend(self, user_id: UUID, metric_name: str, horizon_hours: int) -> Dict[str, Any]:
        """
        Forecast the trend of a specific metric (e.g., heart rate) over a future time horizon.
        """
        pass


class RulePredictionEngine(IPredictionEngine):
    """
    Concrete, deterministic implementation of the Prediction Engine.

    forecast_overload_event: a linear-trend heuristic over a supplied risk
    score trajectory — no training required. This is also the "teacher"
    the ML PredictionEngine's `--mode distill` training run learns from,
    and the safe fallback when its model artifact is unavailable.

    predict_metric_trend: fetches a user's recent sensor history for the
    requested metric and linearly extrapolates it forward — shared as-is by
    the ML engine (see app/ai/ml/prediction_engine_ml.py), since simple
    trend extrapolation doesn't benefit from a trained model the way
    overload-probability estimation does.
    """

    def __init__(
        self,
        sensor_data_repo=None,
        high_risk_threshold: float = 67.0,
        sample_interval_minutes: float = 5.0,
    ):
        self.sensor_data_repo = sensor_data_repo
        self.high_risk_threshold = high_risk_threshold
        self.sample_interval_minutes = sample_interval_minutes

    @staticmethod
    def _fit_slope(values: List[float]) -> float:
        if len(values) < 2:
            return 0.0
        x = np.arange(len(values))
        return float(np.polyfit(x, np.array(values, dtype=float), 1)[0])

    def _trend_label(self, slope: float) -> str:
        if slope > 0.5:
            return "increasing"
        if slope < -0.5:
            return "decreasing"
        return "stable"

    def _estimate_probability(self, risk_scores: List[float], slope: float) -> float:
        if not risk_scores:
            return 0.0
        last = risk_scores[-1]
        proximity = max(0.0, min(1.0, last / 100.0))
        momentum = max(0.0, min(1.0, slope / 10.0))
        return round(min(1.0, proximity * 0.7 + momentum * 0.3), 3)

    def _estimate_eta_minutes(self, risk_scores: List[float], slope: float) -> Optional[float]:
        if not risk_scores:
            return None
        last = risk_scores[-1]
        if slope <= 0.1 or last >= self.high_risk_threshold:
            return None
        return round((self.high_risk_threshold - last) / slope * self.sample_interval_minutes, 1)

    async def forecast_overload_event(self, user_id: UUID, current_trajectory: Dict[str, Any]) -> Dict[str, Any]:
        risk_scores = [v for v in (current_trajectory.get("risk_scores") or []) if v is not None]

        if not risk_scores:
            return {
                "overload_probability": 0.0,
                "estimated_minutes_to_event": None,
                "trend": "stable",
                "method": "RulePredictionEngine",
            }

        slope = self._fit_slope(risk_scores)

        return {
            "overload_probability": self._estimate_probability(risk_scores, slope),
            "estimated_minutes_to_event": self._estimate_eta_minutes(risk_scores, slope),
            "trend": self._trend_label(slope),
            "method": "RulePredictionEngine",
        }

    async def predict_metric_trend(self, user_id: UUID, metric_name: str, horizon_hours: int) -> Dict[str, Any]:
        if self.sensor_data_repo is None:
            raise RuntimeError("RulePredictionEngine.predict_metric_trend requires a sensor_data_repo.")

        records = await self.sensor_data_repo.get_history(user_id=user_id, skip=0, limit=200, sort_by="desc")
        records = list(reversed(records))  # chronological order for a sensible trend

        values = [getattr(r, metric_name, None) for r in records]
        values = [v for v in values if v is not None]

        if len(values) < 2:
            return {
                "status": "insufficient_data",
                "metric_name": metric_name,
                "samples_collected": len(values),
            }

        slope = self._fit_slope(values)
        current_value = values[-1]
        # slope is "per reading" — project forward using the same sample interval
        # assumption as forecast_overload_event, converted to the requested horizon.
        steps_in_horizon = (horizon_hours * 60.0) / self.sample_interval_minutes
        predicted_value = round(current_value + slope * steps_in_horizon, 2)

        return {
            "status": "ok",
            "metric_name": metric_name,
            "horizon_hours": horizon_hours,
            "current_value": round(current_value, 2),
            "predicted_value": predicted_value,
            "trend": self._trend_label(slope),
            "samples_analyzed": len(values),
            "method": "RulePredictionEngine",
        }
