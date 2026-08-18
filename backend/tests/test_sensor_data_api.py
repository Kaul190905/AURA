import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

from app.main import app
from app.schemas.sensor_data import SensorDataAnalysisResponse, SensorDataResponse
from app.api.dependencies.services import get_sensor_data_service


@pytest.fixture
def mock_sensor_service():
    service = AsyncMock()
    app.dependency_overrides[get_sensor_data_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_sensor_data_service, None)


def make_sensor_data(user_id):
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid4()),
        "user_id": str(user_id),
        "timestamp": now,
        "heart_rate": 75.0,
        "blood_oxygen": 98.0,
        "temperature": 22.0,
        "noise": 40.0,
        "latitude": None,
        "longitude": None,
        "created_at": now,
        "updated_at": now,
    }


def make_analysis(user_id, risk_level="LOW", risk_score=10.0, reasons=None, recommendations=None):
    return SensorDataAnalysisResponse(
        sensor_data=SensorDataResponse(**make_sensor_data(user_id)),
        risk_score=risk_score,
        risk_level=risk_level,
        reasons=reasons or ["All metrics are within optimal and preferred ranges."],
        recommendations=recommendations or [],
    )


# ---- submit_sensor_data ----

@pytest.mark.asyncio
async def test_submit_sensor_data_success(client, override_auth, mock_sensor_service):
    user_id = override_auth.id
    mock_sensor_service.create_sensor_data.return_value = make_analysis(user_id)

    resp = await client.post(
        f"/api/v1/sensor-data/?dev_user_id={user_id}",
        json={"heart_rate": 75.0, "temperature": 22.0, "noise": 40.0},
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["risk_level"] == "LOW"
    mock_sensor_service.create_sensor_data.assert_awaited_once()
    called_user_id = mock_sensor_service.create_sensor_data.call_args.args[0]
    assert called_user_id == user_id


@pytest.mark.asyncio
async def test_submit_sensor_data_high_risk_includes_recommendations(client, override_auth, mock_sensor_service):
    user_id = override_auth.id
    mock_sensor_service.create_sensor_data.return_value = make_analysis(
        user_id,
        risk_level="HIGH",
        risk_score=88.0,
        reasons=["Elevated heart rate (150 bpm)."],
        recommendations=["Perform a 5-minute breathing exercise to lower your heart rate."],
    )

    resp = await client.post(f"/api/v1/sensor-data/?dev_user_id={user_id}", json={"heart_rate": 150})

    assert resp.status_code == 201
    body = resp.json()
    assert body["risk_level"] == "HIGH"
    assert body["recommendations"]


@pytest.mark.asyncio
async def test_submit_sensor_data_without_dev_user_id_generates_random_uuid(client, override_auth, mock_sensor_service):
    mock_sensor_service.create_sensor_data.return_value = make_analysis(override_auth.id)

    resp = await client.post("/api/v1/sensor-data/", json={})

    assert resp.status_code == 201
    called_user_id = mock_sensor_service.create_sensor_data.call_args.args[0]
    assert isinstance(called_user_id, UUID)


@pytest.mark.asyncio
async def test_submit_sensor_data_invalid_payload_returns_422(client, override_auth, mock_sensor_service):
    resp = await client.post("/api/v1/sensor-data/", json={"heart_rate": "not-a-number"})
    assert resp.status_code == 422
    mock_sensor_service.create_sensor_data.assert_not_awaited()


# ---- get_sensor_data_history ----

@pytest.mark.asyncio
async def test_get_sensor_data_history_success(client, mock_sensor_service):
    user_id = uuid4()
    mock_sensor_service.get_history.return_value = [make_sensor_data(user_id)]

    resp = await client.get(f"/api/v1/sensor-data/history?user_id={user_id}")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["user_id"] == str(user_id)


@pytest.mark.asyncio
async def test_get_sensor_data_history_empty(client, mock_sensor_service):
    mock_sensor_service.get_history.return_value = []

    resp = await client.get("/api/v1/sensor-data/history")

    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_sensor_data_history_respects_pagination_params(client, mock_sensor_service):
    mock_sensor_service.get_history.return_value = []

    resp = await client.get("/api/v1/sensor-data/history?skip=10&limit=5&sort_by=asc")

    assert resp.status_code == 200
    mock_sensor_service.get_history.assert_awaited_once()
    _, kwargs = mock_sensor_service.get_history.call_args
    assert kwargs["skip"] == 10
    assert kwargs["limit"] == 5
    assert kwargs["sort_by"] == "asc"


@pytest.mark.asyncio
async def test_get_sensor_data_history_invalid_sort_by_returns_422(client, mock_sensor_service):
    resp = await client.get("/api/v1/sensor-data/history?sort_by=sideways")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_sensor_data_history_invalid_limit_returns_422(client, mock_sensor_service):
    resp = await client.get("/api/v1/sensor-data/history?limit=0")
    assert resp.status_code == 422
