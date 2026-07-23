import pytest

from app.ai.recommendation_engine import RecommendationEngine
from app.ai.llm.recommendation_engine_ai import AIRecommendationEngine
from app.api.dependencies.services import get_recommendation_engine
from app.core.settings import settings


@pytest.fixture(autouse=True)
def _restore_settings():
    original_flag = settings.USE_AI_RECOMMENDATION_ENGINE
    original_groq_key = settings.GROQ_API_KEY

    # Isolate tests by clearing keys by default
    settings.GROQ_API_KEY = None

    yield
    settings.USE_AI_RECOMMENDATION_ENGINE = original_flag
    settings.GROQ_API_KEY = original_groq_key


def test_flag_disabled_returns_rule_engine():
    settings.USE_AI_RECOMMENDATION_ENGINE = False
    settings.GROQ_API_KEY = "gsk-test-key"

    engine = get_recommendation_engine()

    assert isinstance(engine, RecommendationEngine)
    assert not isinstance(engine, AIRecommendationEngine)


def test_flag_enabled_without_api_key_returns_rule_engine():
    settings.USE_AI_RECOMMENDATION_ENGINE = True
    settings.GROQ_API_KEY = None

    engine = get_recommendation_engine()

    assert isinstance(engine, RecommendationEngine)
    assert not isinstance(engine, AIRecommendationEngine)


def test_flag_enabled_with_groq_key_returns_ai_engine():
    settings.USE_AI_RECOMMENDATION_ENGINE = True
    settings.GROQ_API_KEY = "gsk-test-key"

    engine = get_recommendation_engine()

    assert isinstance(engine, AIRecommendationEngine)
    assert isinstance(engine.rule_engine, RecommendationEngine)
