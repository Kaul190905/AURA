import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from app.main import app
from app.api.dependencies.services import get_prediction_service


@pytest.fixture
def mock_prediction_service():
    service = AsyncMock()
    app.dependency_overrides[get_prediction_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_prediction_service, None)


# ---- GET /prediction/overload-forecast ----

@pytest.mark.asyncio
async def test_get_overload_forecast_success(client, mock_prediction_service):
    user_id = uuid4()
    mock_prediction_service.get_overload_forecast.return_value = {
        "user_id": user_id,
        "overload_probability": 0.72,
        "estimated_minutes_to_event": 15.0,
        "trend": "increasing",
        "method": "RulePredictionEngine",
        "samples_used": 10,
    }

    resp = await client.get(f"/api/v1/prediction/overload-forecast?user_id={user_id}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["overload_probability"] == 0.72
    assert body["trend"] == "increasing"
    mock_prediction_service.get_overload_forecast.assert_awaited_once_with(user_id, window=10)


@pytest.mark.asyncio
async def test_get_overload_forecast_respects_window_param(client, mock_prediction_service):
    user_id = uuid4()
    mock_prediction_service.get_overload_forecast.return_value = {
        "user_id": user_id, "overload_probability": 0.0, "estimated_minutes_to_event": None,
        "trend": "stable", "method": "RulePredictionEngine", "samples_used": 0,
    }

    resp = await client.get(f"/api/v1/prediction/overload-forecast?user_id={user_id}&window=25")

    assert resp.status_code == 200
    mock_prediction_service.get_overload_forecast.assert_awaited_once_with(user_id, window=25)


@pytest.mark.asyncio
async def test_get_overload_forecast_requires_user_id(client, mock_prediction_service):
    resp = await client.get("/api/v1/prediction/overload-forecast")
    assert resp.status_code == 422
    mock_prediction_service.get_overload_forecast.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_overload_forecast_window_out_of_range_returns_422(client, mock_prediction_service):
    user_id = uuid4()
    resp = await client.get(f"/api/v1/prediction/overload-forecast?user_id={user_id}&window=1")
    assert resp.status_code == 422


# ---- GET /prediction/trend ----

@pytest.mark.asyncio
async def test_get_metric_trend_success(client, mock_prediction_service):
    user_id = uuid4()
    mock_prediction_service.get_metric_trend.return_value = {
        "status": "ok",
        "metric_name": "heart_rate",
        "horizon_hours": 6,
        "current_value": 75.0,
        "predicted_value": 82.0,
        "trend": "increasing",
        "samples_analyzed": 20,
        "method": "RulePredictionEngine",
    }

    resp = await client.get(f"/api/v1/prediction/trend?user_id={user_id}&metric_name=heart_rate&horizon_hours=6")

    assert resp.status_code == 200
    body = resp.json()
    assert body["predicted_value"] == 82.0
    mock_prediction_service.get_metric_trend.assert_awaited_once_with(user_id, "heart_rate", 6)


@pytest.mark.asyncio
async def test_get_metric_trend_requires_metric_name(client, mock_prediction_service):
    resp = await client.get(f"/api/v1/prediction/trend?user_id={uuid4()}")
    assert resp.status_code == 422
    mock_prediction_service.get_metric_trend.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_metric_trend_insufficient_data(client, mock_prediction_service):
    user_id = uuid4()
    mock_prediction_service.get_metric_trend.return_value = {
        "status": "insufficient_data", "metric_name": "heart_rate", "samples_collected": 1,
    }

    resp = await client.get(f"/api/v1/prediction/trend?user_id={user_id}&metric_name=heart_rate")

    assert resp.status_code == 200
    assert resp.json()["status"] == "insufficient_data"
