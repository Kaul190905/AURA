import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from app.main import app
from app.api.dependencies.services import get_risk_engine


@pytest.fixture
def mock_risk_engine():
    engine = AsyncMock()
    app.dependency_overrides[get_risk_engine] = lambda: engine
    yield engine
    app.dependency_overrides.pop(get_risk_engine, None)


@pytest.mark.asyncio
async def test_get_risk_trend_success(client, mock_risk_engine):
    user_id = uuid4()
    mock_risk_engine.analyze_historical_risk.return_value = {
        "status": "ok",
        "time_window_days": 7,
        "samples_analyzed": 20,
        "avg_risk_score": 35.2,
        "max_risk_score": 80.0,
        "min_risk_score": 10.0,
        "trend_slope": 1.2,
        "trend": "increasing",
    }

    resp = await client.get(f"/api/v1/risk/trend?user_id={user_id}&days=7")

    assert resp.status_code == 200
    body = resp.json()
    assert body["trend"] == "increasing"
    mock_risk_engine.analyze_historical_risk.assert_awaited_once_with(user_id, 7)


@pytest.mark.asyncio
async def test_get_risk_trend_rule_engine_not_implemented(client, mock_risk_engine):
    user_id = uuid4()
    mock_risk_engine.analyze_historical_risk.return_value = {"status": "not_implemented"}

    resp = await client.get(f"/api/v1/risk/trend?user_id={user_id}")

    assert resp.status_code == 200
    assert resp.json() == {"status": "not_implemented"}


@pytest.mark.asyncio
async def test_get_risk_trend_defaults_to_7_days(client, mock_risk_engine):
    user_id = uuid4()
    mock_risk_engine.analyze_historical_risk.return_value = {"status": "no_data", "time_window_days": 7}

    resp = await client.get(f"/api/v1/risk/trend?user_id={user_id}")

    assert resp.status_code == 200
    mock_risk_engine.analyze_historical_risk.assert_awaited_once_with(user_id, 7)


@pytest.mark.asyncio
async def test_get_risk_trend_requires_user_id(client, mock_risk_engine):
    resp = await client.get("/api/v1/risk/trend")
    assert resp.status_code == 422
    mock_risk_engine.analyze_historical_risk.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_risk_trend_days_out_of_range_returns_422(client, mock_risk_engine):
    user_id = uuid4()
    resp = await client.get(f"/api/v1/risk/trend?user_id={user_id}&days=200")
    assert resp.status_code == 422
