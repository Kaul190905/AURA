import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import uuid4

from app.main import app
from app.api.dependencies.services import get_wellness_service


@pytest.fixture
def mock_wellness_service():
    service = AsyncMock()
    app.dependency_overrides[get_wellness_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_wellness_service, None)


# ---- POST /wellness/{user_id}/checkins ----

@pytest.mark.asyncio
async def test_submit_checkin_success(client, mock_wellness_service):
    user_id = uuid4()
    now = datetime.now(timezone.utc).isoformat()
    mock_wellness_service.submit_checkin.return_value = {
        "id": str(uuid4()),
        "user_id": str(user_id),
        "mood_score": 75.0,
        "notes": "Feeling okay today.",
        "created_at": now,
        "updated_at": now,
    }

    resp = await client.post(
        f"/api/v1/wellness/{user_id}/checkins",
        json={"mood_score": 75.0, "notes": "Feeling okay today."},
    )

    assert resp.status_code == 201
    assert resp.json()["mood_score"] == 75.0
    mock_wellness_service.submit_checkin.assert_awaited_once()


@pytest.mark.asyncio
async def test_submit_checkin_out_of_range_score_returns_422(client, mock_wellness_service):
    resp = await client.post(f"/api/v1/wellness/{uuid4()}/checkins", json={"mood_score": 150})
    assert resp.status_code == 422
    mock_wellness_service.submit_checkin.assert_not_awaited()


@pytest.mark.asyncio
async def test_submit_checkin_missing_score_returns_422(client, mock_wellness_service):
    resp = await client.post(f"/api/v1/wellness/{uuid4()}/checkins", json={"notes": "no score"})
    assert resp.status_code == 422
    mock_wellness_service.submit_checkin.assert_not_awaited()


# ---- GET /wellness/{user_id}/score ----

@pytest.mark.asyncio
async def test_get_wellness_score_success(client, mock_wellness_service):
    user_id = uuid4()
    mock_wellness_service.get_score.return_value = {
        "user_id": user_id,
        "wellness_score": 82,
        "components": {"physical": 90.0, "mental": 80.0, "stability": 95.0},
        "method": "RuleWellnessEngine",
    }

    resp = await client.get(f"/api/v1/wellness/{user_id}/score")

    assert resp.status_code == 200
    body = resp.json()
    assert body["wellness_score"] == 82
    assert body["components"]["physical"] == 90.0
    mock_wellness_service.get_score.assert_awaited_once_with(user_id)


@pytest.mark.asyncio
async def test_get_wellness_score_invalid_user_id_returns_422(client, mock_wellness_service):
    resp = await client.get("/api/v1/wellness/not-a-uuid/score")
    assert resp.status_code == 422
    mock_wellness_service.get_score.assert_not_awaited()
