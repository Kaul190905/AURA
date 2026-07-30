import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import uuid4

from app.main import app
from app.api.dependencies.services import get_overload_event_service


@pytest.fixture
def mock_overload_event_service():
    service = AsyncMock()
    app.dependency_overrides[get_overload_event_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_overload_event_service, None)


def make_event(user_id=None, trigger_metric="noise", trigger_value=95.0, duration_seconds=120):
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid4()),
        "user_id": str(user_id or uuid4()),
        "trigger_metric": trigger_metric,
        "trigger_value": trigger_value,
        "duration_seconds": duration_seconds,
        "created_at": now,
        "updated_at": now,
    }


# ---- create_overload_event ----

@pytest.mark.asyncio
async def test_create_overload_event_success(client, mock_overload_event_service):
    user_id = uuid4()
    mock_overload_event_service.create_event.return_value = make_event(user_id)

    payload = {
        "user_id": str(user_id),
        "trigger_metric": "noise",
        "trigger_value": 95.0,
        "duration_seconds": 120,
    }
    resp = await client.post("/api/v1/overload-events/", json=payload)

    assert resp.status_code == 201
    assert resp.json()["trigger_metric"] == "noise"
    mock_overload_event_service.create_event.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_overload_event_missing_field_returns_422(client, mock_overload_event_service):
    resp = await client.post("/api/v1/overload-events/", json={"trigger_metric": "noise"})
    assert resp.status_code == 422
    mock_overload_event_service.create_event.assert_not_awaited()


# ---- get_overload_events ----

@pytest.mark.asyncio
async def test_get_overload_events_no_filters(client, mock_overload_event_service):
    mock_overload_event_service.get_events.return_value = [make_event(), make_event()]

    resp = await client.get("/api/v1/overload-events/")

    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_get_overload_events_with_user_filter(client, mock_overload_event_service):
    user_id = uuid4()
    mock_overload_event_service.get_events.return_value = [make_event(user_id)]

    resp = await client.get(f"/api/v1/overload-events/?user_id={user_id}&sort_by=asc")

    assert resp.status_code == 200
    mock_overload_event_service.get_events.assert_awaited_once()
    _, kwargs = mock_overload_event_service.get_events.call_args
    assert kwargs["user_id"] == user_id
    assert kwargs["sort_by"] == "asc"


@pytest.mark.asyncio
async def test_get_overload_events_invalid_sort_by_returns_422(client, mock_overload_event_service):
    resp = await client.get("/api/v1/overload-events/?sort_by=nope")
    assert resp.status_code == 422
