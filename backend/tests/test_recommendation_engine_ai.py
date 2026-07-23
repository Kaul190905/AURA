import json
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.ai.llm.recommendation_engine_ai import AIRecommendationEngine
from app.ai.recommendation_engine import RecommendationEngine


def _make_groq_response(text: str):
    """Fakes a groq ChatCompletion response shape."""
    choice = MagicMock()
    choice.message.content = text
    response = MagicMock()
    response.choices = [choice]
    return response


@pytest.fixture
def rule_engine():
    return RecommendationEngine()


HIGH_RISK_CONTEXT = {"risk_score": 80, "sensor_data": {}, "preferences": {}}
CALM_CONTEXT = {"risk_score": 0, "sensor_data": {}, "preferences": {}}


# ---- no client configured (no API key) ----

@pytest.mark.asyncio
async def test_no_client_falls_back_to_rule_text(rule_engine):
    engine = AIRecommendationEngine(rule_engine=rule_engine, api_key=None)
    result = await engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    expected = await rule_engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)
    assert result == expected


# ---- cost optimization: no eligible recommendations -> never call the LLM ----

@pytest.mark.asyncio
async def test_empty_eligible_list_skips_llm_call_entirely(rule_engine):
    mock_client = AsyncMock()
    engine = AIRecommendationEngine(rule_engine=rule_engine, client=mock_client)

    result = await engine.generate_recommendations(uuid4(), CALM_CONTEXT)

    assert result == []
    mock_client.chat.completions.create.assert_not_awaited()


# ---- happy path ----

@pytest.mark.asyncio
async def test_valid_llm_response_is_used(rule_engine):
    eligible = await rule_engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)
    personalized = [f"Personalized: {r}" for r in eligible]

    mock_client = AsyncMock()
    mock_client.chat.completions.create.return_value = _make_groq_response(json.dumps(personalized))

    engine = AIRecommendationEngine(rule_engine=rule_engine, client=mock_client)
    result = await engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    assert result == personalized
    mock_client.chat.completions.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_llm_response_wrapped_in_code_fence_is_parsed(rule_engine):
    eligible = await rule_engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)
    personalized = [f"Personalized: {r}" for r in eligible]
    fenced = "```json\n" + json.dumps(personalized) + "\n```"

    mock_client = AsyncMock()
    mock_client.chat.completions.create.return_value = _make_groq_response(fenced)

    engine = AIRecommendationEngine(rule_engine=rule_engine, client=mock_client)
    result = await engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    assert result == personalized


# ---- safety: LLM can never add/remove recommendations beyond the approved set ----

@pytest.mark.asyncio
async def test_wrong_count_falls_back_to_rule_text(rule_engine):
    eligible = await rule_engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    mock_client = AsyncMock()
    # Model invented an extra recommendation not in the approved set.
    mock_client.chat.completions.create.return_value = _make_groq_response(
        json.dumps(eligible + ["Take unapproved medication X."])
    )

    engine = AIRecommendationEngine(rule_engine=rule_engine, client=mock_client)
    result = await engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    assert result == eligible


@pytest.mark.asyncio
async def test_non_list_response_falls_back_to_rule_text(rule_engine):
    eligible = await rule_engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    mock_client = AsyncMock()
    mock_client.chat.completions.create.return_value = _make_groq_response(json.dumps({"not": "a list"}))

    engine = AIRecommendationEngine(rule_engine=rule_engine, client=mock_client)
    result = await engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    assert result == eligible


@pytest.mark.asyncio
async def test_malformed_json_falls_back_to_rule_text(rule_engine):
    eligible = await rule_engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    mock_client = AsyncMock()
    mock_client.chat.completions.create.return_value = _make_groq_response("not valid json at all")

    engine = AIRecommendationEngine(rule_engine=rule_engine, client=mock_client)
    result = await engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    assert result == eligible


@pytest.mark.asyncio
async def test_empty_string_items_fail_validation_and_fall_back(rule_engine):
    eligible = await rule_engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    mock_client = AsyncMock()
    mock_client.chat.completions.create.return_value = _make_groq_response(json.dumps(["" for _ in eligible]))

    engine = AIRecommendationEngine(rule_engine=rule_engine, client=mock_client)
    result = await engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    assert result == eligible


# ---- resilience: API failures never break the response ----

@pytest.mark.asyncio
async def test_api_exception_falls_back_to_rule_text(rule_engine):
    eligible = await rule_engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    mock_client = AsyncMock()
    mock_client.chat.completions.create.side_effect = Exception("network unreachable")

    engine = AIRecommendationEngine(rule_engine=rule_engine, client=mock_client)
    result = await engine.generate_recommendations(uuid4(), HIGH_RISK_CONTEXT)

    assert result == eligible


# ---- evaluate_recommendation_effectiveness delegates to the rule engine ----

@pytest.mark.asyncio
async def test_evaluate_effectiveness_delegates_to_rule_engine(rule_engine):
    engine = AIRecommendationEngine(rule_engine=rule_engine, api_key=None)
    result = await engine.evaluate_recommendation_effectiveness(uuid4(), uuid4())
    assert result == 0.0


# ---- construction ----

def test_client_none_when_no_api_key_and_no_client(rule_engine):
    engine = AIRecommendationEngine(rule_engine=rule_engine)
    assert engine.client is None


def test_injected_client_is_used_directly(rule_engine):
    mock_client = MagicMock()
    engine = AIRecommendationEngine(rule_engine=rule_engine, client=mock_client)
    assert engine.client is mock_client

