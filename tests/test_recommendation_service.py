import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.services.recommendation_service import RecommendationService


def _make_sensor_row(hr=90, temp=25, noise=70, spo2=97):
    row = MagicMock()
    row.heart_rate = hr
    row.temperature = temp
    row.noise = noise
    row.blood_oxygen = spo2
    return row


@pytest.mark.asyncio
async def test_builds_context_from_latest_sensor_row_and_preferences():
    sensor_repo = AsyncMock()
    sensor_repo.get_history.return_value = [_make_sensor_row(hr=140)]

    prefs = MagicMock()
    prefs.preferred_temperature = 22.0
    prefs.preferred_noise = 60.0
    prefs_repo = AsyncMock()
    prefs_repo.get_by_user_id.return_value = prefs

    risk_engine = AsyncMock()
    risk_engine.evaluate_current_risk.return_value = {
        "risk_score": 75.0, "risk_level": "MEDIUM", "reasons": ["Elevated heart rate."]
    }

    recommendation_engine = AsyncMock()
    recommendation_engine.generate_recommendations.return_value = ["Take a break."]

    service = RecommendationService(sensor_repo, prefs_repo, risk_engine, recommendation_engine)
    result = await service.get_personalized_recommendations(uuid4())

    assert result["risk_score"] == 75.0
    assert result["risk_level"] == "MEDIUM"
    assert result["recommendations"] == ["Take a break."]

    risk_engine.evaluate_current_risk.assert_awaited_once()
    telemetry_arg = risk_engine.evaluate_current_risk.call_args.args[0]
    assert telemetry_arg["heart_rate"] == 140

    recommendation_engine.generate_recommendations.assert_awaited_once()
    context_arg = recommendation_engine.generate_recommendations.call_args.args[1]
    assert context_arg["risk_score"] == 75.0


@pytest.mark.asyncio
async def test_no_sensor_history_uses_empty_telemetry():
    sensor_repo = AsyncMock()
    sensor_repo.get_history.return_value = []

    prefs_repo = AsyncMock()
    prefs_repo.get_by_user_id.return_value = None

    risk_engine = AsyncMock()
    risk_engine.evaluate_current_risk.return_value = {"risk_score": 0.0, "risk_level": "LOW", "reasons": []}

    recommendation_engine = AsyncMock()
    recommendation_engine.generate_recommendations.return_value = []

    service = RecommendationService(sensor_repo, prefs_repo, risk_engine, recommendation_engine)
    result = await service.get_personalized_recommendations(uuid4())

    assert result["recommendations"] == []
    telemetry_arg = risk_engine.evaluate_current_risk.call_args.args[0]
    assert telemetry_arg == {}


@pytest.mark.asyncio
async def test_method_field_reflects_engine_class_name():
    sensor_repo = AsyncMock()
    sensor_repo.get_history.return_value = []
    prefs_repo = AsyncMock()
    prefs_repo.get_by_user_id.return_value = None
    risk_engine = AsyncMock()
    risk_engine.evaluate_current_risk.return_value = {"risk_score": 0.0, "risk_level": "LOW", "reasons": []}

    class FakeAIRecommendationEngine:
        async def generate_recommendations(self, user_id, context):
            return []

    service = RecommendationService(sensor_repo, prefs_repo, risk_engine, FakeAIRecommendationEngine())
    result = await service.get_personalized_recommendations(uuid4())

    assert result["method"] == "FakeAIRecommendationEngine"
