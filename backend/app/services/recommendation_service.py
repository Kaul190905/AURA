from typing import Any, Dict
from uuid import UUID

from app.ai.recommendation_engine import IRecommendationEngine
from app.ai.risk_engine import IRiskEngine
from app.repositories.sensor_data_repository import SensorDataRepository
from app.repositories.user_preference_repository import UserPreferenceRepository


class RecommendationService:
    """
    On-demand recommendation service, separate from the real-time sensor
    ingestion path (SensorDataService). This is where the AI-phrased engine
    is meant to be used — a user asking "what should I do right now?" is a
    read they trigger occasionally, unlike sensor telemetry which can arrive
    every few seconds and must stay cheap and fast.
    """

    def __init__(
        self,
        sensor_data_repo: SensorDataRepository,
        prefs_repo: UserPreferenceRepository,
        risk_engine: IRiskEngine,
        recommendation_engine: IRecommendationEngine,
    ):
        self.sensor_data_repo = sensor_data_repo
        self.prefs_repo = prefs_repo
        self.risk_engine = risk_engine
        self.recommendation_engine = recommendation_engine

    async def get_personalized_recommendations(self, user_id: UUID) -> Dict[str, Any]:
        recent_rows = await self.sensor_data_repo.get_history(user_id=user_id, skip=0, limit=1, sort_by="desc")

        telemetry = {}
        if recent_rows:
            latest = recent_rows[0]
            telemetry = {
                "heart_rate": latest.heart_rate,
                "temperature": latest.temperature,
                "noise": latest.noise,
                "blood_oxygen": latest.blood_oxygen,
            }

        prefs = await self.prefs_repo.get_by_user_id(user_id)
        preferences = {
            "preferred_temperature": getattr(prefs, "preferred_temperature", None),
            "preferred_noise": getattr(prefs, "preferred_noise", None),
        }

        risk_result = await self.risk_engine.evaluate_current_risk(telemetry, preferences)

        context = {
            "risk_score": risk_result["risk_score"],
            "sensor_data": telemetry,
            "preferences": preferences,
        }
        recommendations = await self.recommendation_engine.generate_recommendations(user_id, context)

        return {
            "user_id": user_id,
            "risk_score": risk_result["risk_score"],
            "risk_level": risk_result["risk_level"],
            "recommendations": recommendations,
            "method": type(self.recommendation_engine).__name__,
        }
