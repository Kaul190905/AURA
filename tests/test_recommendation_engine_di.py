import pytest

from app.ai.recommendation_engine import RecommendationEngine
from app.ai.llm.recommendation_engine_ai import AIRecommendationEngine
from app.api.dependencies.services import get_recommendation_engine
from app.core.settings import settings


@pytest.fixture(autouse=True)
def _restore_settings():
    original_flag = settings.USE_AI_RECOMMENDATION_ENGINE
    original_key = settings.ANTHROPIC_API_KEY
    yield
    settings.USE_AI_RECOMMENDATION_ENGINE = original_flag
    settings.ANTHROPIC_API_KEY = original_key


def test_flag_disabled_returns_rule_engine():
    settings.USE_AI_RECOMMENDATION_ENGINE = False
    settings.ANTHROPIC_API_KEY = "sk-test-key"

    engine = get_recommendation_engine()

    assert isinstance(engine, RecommendationEngine)
    assert not isinstance(engine, AIRecommendationEngine)


def test_flag_enabled_without_api_key_returns_rule_engine():
    settings.USE_AI_RECOMMENDATION_ENGINE = True
    settings.ANTHROPIC_API_KEY = None

    engine = get_recommendation_engine()

    assert isinstance(engine, RecommendationEngine)
    assert not isinstance(engine, AIRecommendationEngine)


def test_flag_enabled_with_api_key_returns_ai_engine():
    settings.USE_AI_RECOMMENDATION_ENGINE = True
    settings.ANTHROPIC_API_KEY = "sk-test-key"

    engine = get_recommendation_engine()

    assert isinstance(engine, AIRecommendationEngine)
    assert isinstance(engine.rule_engine, RecommendationEngine)
