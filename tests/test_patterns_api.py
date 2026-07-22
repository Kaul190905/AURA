import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from app.main import app
from app.api.dependencies.services import get_pattern_service


@pytest.fixture
def mock_pattern_service():
    service = AsyncMock()
    app.dependency_overrides[get_pattern_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_pattern_service, None)


# ---- GET /patterns/anomalies ----

@pytest.mark.asyncio
async def test_get_anomalies_success(client, mock_pattern_service):
    user_id = uuid4()
    mock_pattern_service.get_anomalies.return_value = {
        "user_id": user_id,
        "analyzed_count": 10,
        "anomaly_count": 1,
        "anomalies": [
            {
                "index": 9,
                "record": {"heart_rate": 400, "blood_oxygen": 97, "temperature": 22, "noise": 50},
                "is_anomaly": True,
                "anomaly_score": 3.1,
                "method": "zscore_fallback",
            }
        ],
    }

    resp = await client.get(f"/api/v1/patterns/anomalies?user_id={user_id}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["analyzed_count"] == 10
    assert body["anomaly_count"] == 1
    assert body["anomalies"][0]["is_anomaly"] is True
    mock_pattern_service.get_anomalies.assert_awaited_once_with(user_id, limit=50)


@pytest.mark.asyncio
async def test_get_anomalies_respects_limit_param(client, mock_pattern_service):
    user_id = uuid4()
    mock_pattern_service.get_anomalies.return_value = {
        "user_id": user_id,
        "analyzed_count": 0,
        "anomaly_count": 0,
        "anomalies": [],
    }

    resp = await client.get(f"/api/v1/patterns/anomalies?user_id={user_id}&limit=100")

    assert resp.status_code == 200
    mock_pattern_service.get_anomalies.assert_awaited_once_with(user_id, limit=100)


@pytest.mark.asyncio
async def test_get_anomalies_requires_user_id(client, mock_pattern_service):
    resp = await client.get("/api/v1/patterns/anomalies")
    assert resp.status_code == 422
    mock_pattern_service.get_anomalies.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_anomalies_limit_out_of_range_returns_422(client, mock_pattern_service):
    user_id = uuid4()
    resp = await client.get(f"/api/v1/patterns/anomalies?user_id={user_id}&limit=1")
    assert resp.status_code == 422


# ---- GET /patterns/behavioral ----

@pytest.mark.asyncio
async def test_get_behavioral_patterns_success(client, mock_pattern_service):
    user_id = uuid4()
    mock_pattern_service.get_behavioral_patterns.return_value = {
        "status": "ok",
        "samples_analyzed": 30,
        "clusters": [
            {
                "cluster_id": 0,
                "size": 15,
                "share": 0.5,
                "avg_metrics": {"heart_rate": 60.0, "noise": 30.0},
                "label": "rest-period",
            }
        ],
        "dominant_pattern": "rest-period",
    }

    resp = await client.get(f"/api/v1/patterns/behavioral?user_id={user_id}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["dominant_pattern"] == "rest-period"
    mock_pattern_service.get_behavioral_patterns.assert_awaited_once_with(user_id)


@pytest.mark.asyncio
async def test_get_behavioral_patterns_insufficient_data(client, mock_pattern_service):
    user_id = uuid4()
    mock_pattern_service.get_behavioral_patterns.return_value = {
        "status": "insufficient_data",
        "samples_collected": 3,
        "samples_required": 20,
    }

    resp = await client.get(f"/api/v1/patterns/behavioral?user_id={user_id}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "insufficient_data"
    assert body["samples_required"] == 20


@pytest.mark.asyncio
async def test_get_behavioral_patterns_requires_user_id(client, mock_pattern_service):
    resp = await client.get("/api/v1/patterns/behavioral")
    assert resp.status_code == 422
    mock_pattern_service.get_behavioral_patterns.assert_not_awaited()
