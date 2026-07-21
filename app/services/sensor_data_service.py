import uuid
from datetime import datetime
from typing import Optional, List
from app.schemas.sensor_data import SensorDataCreate, SensorDataResponse, SensorDataAnalysisResponse
from app.repositories.sensor_data_repository import SensorDataRepository
from app.repositories.user_preference_repository import UserPreferenceRepository
from app.services.alert_service import AlertService
from app.schemas.alert import AlertCreate
from app.ai.risk_engine import IRiskEngine
from app.ai.recommendation_engine import IRecommendationEngine

class SensorDataService:
    """Service layer for sensor data operations."""
    
    def __init__(
        self, 
        sensor_data_repo: SensorDataRepository,
        prefs_repo: UserPreferenceRepository,
        alert_service: AlertService,
        risk_engine: IRiskEngine,
        recommendation_engine: IRecommendationEngine
    ):
        self.sensor_data_repo = sensor_data_repo
        self.prefs_repo = prefs_repo
        self.alert_service = alert_service
        self.risk_engine = risk_engine
        self.recommendation_engine = recommendation_engine

    async def create_sensor_data(self, user_id: uuid.UUID, data_in: SensorDataCreate) -> SensorDataAnalysisResponse:
        """
        Validate and create new sensor data, analyze risk, and generate recommendations.
        """
        # 1. Store sensor data
        created_data = await self.sensor_data_repo.create(user_id, data_in)
        telemetry_dict = data_in.model_dump()
        
        # 2. Fetch user preferences
        prefs = await self.prefs_repo.get_by_user_id(user_id)
        prefs_dict = prefs.__dict__ if prefs else {}
        
        # 3. Run Risk Engine
        risk_result = await self.risk_engine.evaluate_current_risk(telemetry_dict, prefs_dict)
        
        # 4. Run Recommendation Engine
        context = {
            "risk_score": risk_result["risk_score"],
            "sensor_data": telemetry_dict,
            "preferences": prefs_dict
        }
        recommendations = await self.recommendation_engine.generate_recommendations(user_id, context)
        
        # 5. Create Alert if HIGH risk
        if risk_result["risk_level"] == "HIGH":
            alert_msg = "High risk detected due to: " + ", ".join(risk_result["reasons"])
            alert_data = AlertCreate(
                user_id=user_id,
                type="Risk",
                severity="HIGH",
                message=alert_msg
            )
            await self.alert_service.create_alert(alert_data)
            
        # 6. Return comprehensive analysis
        return SensorDataAnalysisResponse(
            sensor_data=SensorDataResponse.model_validate(created_data),
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            reasons=risk_result["reasons"],
            recommendations=recommendations
        )

    async def get_history(
        self,
        user_id: Optional[uuid.UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "desc"
    ) -> List[SensorDataResponse]:
        """
        Get paginated, filtered, and sorted sensor data history.
        """
        history = await self.sensor_data_repo.get_history(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            skip=skip,
            limit=limit,
            sort_by=sort_by
        )
        return history
