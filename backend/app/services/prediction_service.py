from typing import Any, Dict
from uuid import UUID

from app.ai.prediction_engine import IPredictionEngine
from app.ai.risk_engine import IRiskEngine
from app.repositories.sensor_data_repository import SensorDataRepository


class PredictionService:
    """
    Builds the risk-score trajectory a forecast needs from raw sensor
    history, then hands off to the active PredictionEngine. Mirrors how
    SensorDataService builds context for the RiskEngine — the engine stays
    a pure function of the data it's given for forecast_overload_event.
    """

    def __init__(
        self,
        sensor_data_repo: SensorDataRepository,
        risk_engine: IRiskEngine,
        prediction_engine: IPredictionEngine,
    ):
        self.sensor_data_repo = sensor_data_repo
        self.risk_engine = risk_engine
        self.prediction_engine = prediction_engine

    async def get_overload_forecast(self, user_id: UUID, window: int = 10) -> Dict[str, Any]:
        rows = await self.sensor_data_repo.get_history(user_id=user_id, skip=0, limit=window, sort_by="desc")
        rows = list(reversed(rows))  # chronological order for a meaningful trajectory

        risk_scores = []
        for row in rows:
            telemetry = {
                "heart_rate": row.heart_rate,
                "temperature": row.temperature,
                "noise": row.noise,
                "blood_oxygen": row.blood_oxygen,
            }
            # NOTE: preferences intentionally omitted (defaults apply) — this is a
            # quick trajectory summary, not a full per-reading risk re-evaluation.
            result = await self.risk_engine.evaluate_current_risk(telemetry, {})
            risk_scores.append(result["risk_score"])

        forecast = await self.prediction_engine.forecast_overload_event(
            user_id, {"risk_scores": risk_scores}
        )
        forecast["user_id"] = user_id
        forecast["samples_used"] = len(risk_scores)
        return forecast

    async def get_metric_trend(self, user_id: UUID, metric_name: str, horizon_hours: int) -> Dict[str, Any]:
        return await self.prediction_engine.predict_metric_trend(user_id, metric_name, horizon_hours)
