import logging

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.db import get_db
from app.core.settings import settings
from app.repositories.user_repository import UserRepository
from app.repositories.user_preference_repository import UserPreferenceRepository
from app.services.user_service import UserService
from app.repositories.sensor_data_repository import SensorDataRepository
from app.services.sensor_data_service import SensorDataService
from app.repositories.alert_repository import AlertRepository
from app.services.alert_service import AlertService
from app.ai.pattern_engine import IPatternEngine
from app.ai.risk_engine import IRiskEngine
from app.ai.wellness_engine import IWellnessEngine
from app.ai.recommendation_engine import IRecommendationEngine
from app.services.pattern_service import PatternService
from app.repositories.wellness_checkin_repository import WellnessCheckinRepository
from app.services.wellness_service import WellnessService
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)

def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    """Dependency to provide a UserRepository instance."""
    return UserRepository(db)

def get_user_preference_repository(db: AsyncSession = Depends(get_db)) -> UserPreferenceRepository:
    """Dependency to provide a UserPreferenceRepository instance."""
    return UserPreferenceRepository(db)

def get_user_service(
    user_repo: UserRepository = Depends(get_user_repository),
    prefs_repo: UserPreferenceRepository = Depends(get_user_preference_repository)
) -> UserService:
    """Dependency to provide a UserService instance."""
    return UserService(user_repo, prefs_repo)

def get_sensor_data_repository(db: AsyncSession = Depends(get_db)) -> SensorDataRepository:
    """Dependency to provide a SensorDataRepository instance."""
    return SensorDataRepository(db)

def get_alert_repository(db: AsyncSession = Depends(get_db)) -> AlertRepository:
    """Dependency to provide a AlertRepository instance."""
    return AlertRepository(db)

def get_alert_service(
    alert_repo: AlertRepository = Depends(get_alert_repository)
) -> AlertService:
    """Dependency to provide a AlertService instance."""
    return AlertService(alert_repo)

def get_risk_engine(
    sensor_repo: SensorDataRepository = Depends(get_sensor_data_repository),
) -> IRiskEngine:
    """
    Dependency to provide the active Risk Engine.

    Uses the ML-backed engine when USE_ML_RISK_ENGINE is enabled and a
    trained model artifact exists; otherwise (or on load failure) falls back
    to the rule-based engine so risk scoring never hard-fails a request.
    """
    from app.ai.risk_engine import RiskEngine

    if settings.USE_ML_RISK_ENGINE:
        try:
            from app.ai.ml.risk_engine_ml import MLRiskEngine

            return MLRiskEngine(sensor_data_repo=sensor_repo)
        except FileNotFoundError as e:
            logger.warning("ML risk model unavailable (%s) — falling back to rule-based RiskEngine.", e)

    return RiskEngine()

def get_sensor_data_service(
    sensor_repo: SensorDataRepository = Depends(get_sensor_data_repository),
    prefs_repo: UserPreferenceRepository = Depends(get_user_preference_repository),
    alert_service: AlertService = Depends(get_alert_service),
    risk_engine: IRiskEngine = Depends(get_risk_engine)
) -> SensorDataService:
    """Dependency to provide a SensorDataService instance."""
    from app.ai.recommendation_engine import RecommendationEngine

    recommendation_engine = RecommendationEngine()

    return SensorDataService(
        sensor_data_repo=sensor_repo,
        prefs_repo=prefs_repo,
        alert_service=alert_service,
        risk_engine=risk_engine,
        recommendation_engine=recommendation_engine
    )

def get_pattern_engine(
    sensor_repo: SensorDataRepository = Depends(get_sensor_data_repository),
) -> IPatternEngine:
    """Dependency to provide the ML-backed Pattern Engine instance."""
    from app.ai.ml.pattern_engine_ml import MLPatternEngine

    return MLPatternEngine(sensor_data_repo=sensor_repo)

def get_pattern_service(
    sensor_repo: SensorDataRepository = Depends(get_sensor_data_repository),
    pattern_engine: IPatternEngine = Depends(get_pattern_engine),
) -> PatternService:
    """Dependency to provide a PatternService instance."""
    return PatternService(sensor_repo, pattern_engine)

def get_wellness_checkin_repository(db: AsyncSession = Depends(get_db)) -> WellnessCheckinRepository:
    """Dependency to provide a WellnessCheckinRepository instance."""
    return WellnessCheckinRepository(db)

def get_wellness_engine(
    sensor_repo: SensorDataRepository = Depends(get_sensor_data_repository),
    prefs_repo: UserPreferenceRepository = Depends(get_user_preference_repository),
    wellness_checkin_repo: WellnessCheckinRepository = Depends(get_wellness_checkin_repository),
    risk_engine: IRiskEngine = Depends(get_risk_engine),
    pattern_engine: IPatternEngine = Depends(get_pattern_engine),
) -> IWellnessEngine:
    """
    Dependency to provide the active Wellness Engine.

    Uses the ML-backed engine (learned overall score, still-deterministic
    category breakdown) when USE_ML_WELLNESS_ENGINE is enabled and a trained
    model exists; otherwise falls back to the fully rule-based engine.
    """
    from app.ai.wellness_engine import RuleWellnessEngine

    engine_kwargs = dict(
        sensor_data_repo=sensor_repo,
        wellness_checkin_repo=wellness_checkin_repo,
        prefs_repo=prefs_repo,
        risk_engine=risk_engine,
        pattern_engine=pattern_engine,
    )

    if settings.USE_ML_WELLNESS_ENGINE:
        try:
            from app.ai.ml.wellness_engine_ml import MLWellnessEngine

            return MLWellnessEngine(**engine_kwargs)
        except FileNotFoundError as e:
            logger.warning("ML wellness model unavailable (%s) — falling back to rule-based WellnessEngine.", e)

    return RuleWellnessEngine(**engine_kwargs)

def get_wellness_service(
    wellness_checkin_repo: WellnessCheckinRepository = Depends(get_wellness_checkin_repository),
    wellness_engine: IWellnessEngine = Depends(get_wellness_engine),
) -> WellnessService:
    """Dependency to provide a WellnessService instance."""
    return WellnessService(wellness_checkin_repo, wellness_engine)

def get_recommendation_engine() -> IRecommendationEngine:
    """
    Dependency to provide the active Recommendation Engine, for the on-demand
    /recommendations route only.

    NOTE: SensorDataService (real-time ingestion) intentionally always uses
    the plain rule-based RecommendationEngine directly, never this function
    — LLM latency/cost per call is unsuitable for a path that may be hit
    every few seconds by a device. This dependency is only for the
    user-triggered on-demand read.

    Uses the hybrid AI engine (rules.json decides eligibility, an LLM only
    rephrases/personalizes) when USE_AI_RECOMMENDATION_ENGINE is enabled and
    ANTHROPIC_API_KEY is set; otherwise falls back to plain rule-based text.
    """
    from app.ai.recommendation_engine import RecommendationEngine

    rule_engine = RecommendationEngine()

    if settings.USE_AI_RECOMMENDATION_ENGINE and settings.ANTHROPIC_API_KEY:
        from app.ai.llm.recommendation_engine_ai import AIRecommendationEngine

        return AIRecommendationEngine(
            rule_engine=rule_engine,
            api_key=settings.ANTHROPIC_API_KEY,
            model=settings.ANTHROPIC_MODEL,
        )

    return rule_engine

def get_recommendation_service(
    sensor_repo: SensorDataRepository = Depends(get_sensor_data_repository),
    prefs_repo: UserPreferenceRepository = Depends(get_user_preference_repository),
    risk_engine: IRiskEngine = Depends(get_risk_engine),
    recommendation_engine: IRecommendationEngine = Depends(get_recommendation_engine),
) -> RecommendationService:
    """Dependency to provide a RecommendationService instance."""
    return RecommendationService(sensor_repo, prefs_repo, risk_engine, recommendation_engine)
