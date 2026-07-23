import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.services.prediction_service import PredictionService


def _make_sensor_row(hr=90, temp=25, noise=70, spo2=97):
    row = MagicMock()
    row.heart_rate = hr
    row.temperature = temp
    row.noise = noise
    row.blood_oxygen = spo2
    return row


@pytest.mark.asyncio
async def test_get_overload_forecast_builds_trajectory_from_history():
    sensor_repo = AsyncMock()
    sensor_repo.get_history.return_value = [_make_sensor_row(hr=150), _make_sensor_row(hr=100)]

    risk_engine = AsyncMock()
    risk_engine.evaluate_current_risk.side_effect = [
        {"risk_score": 80.0, "risk_level": "HIGH", "reasons": []},
        {"risk_score": 40.0, "risk_level": "MEDIUM", "reasons": []},
    ]

    prediction_engine = AsyncMock()
    prediction_engine.forecast_overload_event.return_value = {
        "overload_probability": 0.6, "estimated_minutes_to_event": 10.0, "trend": "increasing", "method": "Fake"
    }

    service = PredictionService(sensor_repo, risk_engine, prediction_engine)
    result = await service.get_overload_forecast(uuid4(), window=5)

    assert result["overload_probability"] == 0.6
    assert result["samples_used"] == 2
    assert "user_id" in result

    prediction_engine.forecast_overload_event.assert_awaited_once()
    _, context_arg = prediction_engine.forecast_overload_event.call_args.args
    assert context_arg["risk_scores"] == [80.0, 40.0]


@pytest.mark.asyncio
async def test_get_overload_forecast_no_history_gives_empty_trajectory():
    sensor_repo = AsyncMock()
    sensor_repo.get_history.return_value = []

    risk_engine = AsyncMock()
    prediction_engine = AsyncMock()
    prediction_engine.forecast_overload_event.return_value = {
        "overload_probability": 0.0, "estimated_minutes_to_event": None, "trend": "stable", "method": "Fake"
    }

    service = PredictionService(sensor_repo, risk_engine, prediction_engine)
    result = await service.get_overload_forecast(uuid4())

    assert result["samples_used"] == 0
    risk_engine.evaluate_current_risk.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_metric_trend_delegates_to_engine():
    sensor_repo = AsyncMock()
    risk_engine = AsyncMock()
    prediction_engine = AsyncMock()
    prediction_engine.predict_metric_trend.return_value = {"status": "ok", "trend": "increasing"}

    service = PredictionService(sensor_repo, risk_engine, prediction_engine)
    user_id = uuid4()
    result = await service.get_metric_trend(user_id, "heart_rate", 6)

    assert result["status"] == "ok"
    prediction_engine.predict_metric_trend.assert_awaited_once_with(user_id, "heart_rate", 6)
