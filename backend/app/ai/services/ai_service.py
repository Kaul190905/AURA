import uuid
import logging
from typing import Dict, Any, List, Optional
from uuid import UUID
from app.ai.interfaces import IRecommendationProvider
from app.ai.schemas import UnifiedAIResponse
from app.ai.validators import SensorDataValidator
from app.ai.preprocessing import SensorPreprocessor
from app.ai.feature_engineering import FeatureEngineer
from app.ai.feature_store import FeatureStore
from app.ai.engines.risk_engine import RiskEngine
from app.ai.engines.prediction_engine import PredictionEngine
from app.ai.engines.wellness_engine import WellnessEngine
from app.ai.engines.pattern_engine import PatternEngine
from app.ai.engines.decision_engine import DecisionEngine
from app.ai.engines.recommendation_engine import RecommendationEngine
from app.ai.orchestrator import AIOrchestrator

logger = logging.getLogger(__name__)

class MockRecommendationProvider(IRecommendationProvider):
    """
    Mock LLM provider returning pre-formatted soothe recommendations.
    """
    async def get_recommendations(self, prompt: str, context: Dict[str, Any]) -> List[str]:
        logger.info("Mocking AI recommendation response...")
        # Return simple soothe recommendations based on the prompt content
        if "CRITICAL" in prompt or "HIGH" in prompt:
            return [
                "Find a quiet room immediately.",
                "Put on your noise-cancelling headphones.",
                "Take slow, deep breaths to regulate heart rate."
            ]
        return [
            "Sensory levels are normal. Keep staying hydrated.",
            "Take a short walk if you feel any minor tension."
        ]

class AIService:
    """
    API Service layer wrapper for the AURA AI Analytics pipeline.
    Instantiates dependencies and provides a simple execution entrypoint.
    """
    def __init__(
        self,
        orchestrator: Optional[AIOrchestrator] = None,
        feature_store: Optional[FeatureStore] = None
    ):
        # Allow injecting customized orchestrator or build with standard defaults
        self.feature_store = feature_store or FeatureStore()
        
        if orchestrator is not None:
            self.orchestrator = orchestrator
        else:
            # Construct standard pipeline components
            validator = SensorDataValidator()
            preprocessor = SensorPreprocessor()
            feature_engineer = FeatureEngineer()
            
            risk_engine = RiskEngine()
            prediction_engine = PredictionEngine()
            wellness_engine = WellnessEngine()
            pattern_engine = PatternEngine()
            decision_engine = DecisionEngine()
            recommendation_engine = RecommendationEngine()
            mock_provider = MockRecommendationProvider()
            
            self.orchestrator = AIOrchestrator(
                validator=validator,
                preprocessor=preprocessor,
                feature_engineer=feature_engineer,
                feature_store=self.feature_store,
                risk_engine=risk_engine,
                prediction_engine=prediction_engine,
                wellness_engine=wellness_engine,
                pattern_engine=pattern_engine,
                decision_engine=decision_engine,
                recommendation_engine=recommendation_engine,
                recommendation_provider=mock_provider
            )

    async def process_sensor_data(self, *args, **kwargs) -> UnifiedAIResponse:
        """
        Processes incoming sensor telemetry data.
        Flexible signature to support:
        - process_sensor_data(sensor_data_dict)
        - process_sensor_data(user_id, sensor_data_dict)
        """
        user_id: UUID
        sensor_data: Dict[str, Any]

        if len(args) == 2:
            user_id = args[0]
            sensor_data = args[1]
        elif len(args) == 1:
            sensor_data = args[0]
            # Try to extract user_id, fallback to random UUID
            uid_str = sensor_data.get("user_id")
            if uid_str:
                try:
                    user_id = UUID(str(uid_str))
                except ValueError:
                    user_id = uuid.uuid4()
            else:
                user_id = uuid.uuid4()
        else:
            # Try from kwargs
            user_id = kwargs.get("user_id") or uuid.uuid4()
            sensor_data = kwargs.get("sensor_data") or kwargs

        # Run pipeline
        return await self.orchestrator.execute_pipeline(user_id, sensor_data)
