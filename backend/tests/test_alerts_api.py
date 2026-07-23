import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi import HTTPException, status

from app.main import app
from app.api.dependencies.services import get_alert_service


@pytest.fixture
def mock_alert_service():
    service = AsyncMock()
    app.dependency_overrides[get_alert_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_alert_service, None)


def make_alert(user_id=None, severity="HIGH", is_resolved=False):
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid4()),
        "user_id": str(user_id or uuid4()),
        "type": "Risk",
        "severity": severity,
        "message": "High risk detected due to elevated heart rate.",
        "is_resolved": is_resolved,
        "created_at": now,
        "updated_at": now,
    }


# ---- create_alert ----

@pytest.mark.asyncio
async def test_create_alert_success(client, mock_alert_service):
    user_id = uuid4()
    mock_alert_service.create_alert.return_value = make_alert(user_id)

    payload = {
        "user_id": str(user_id),
        "type": "Risk",
        "severity": "HIGH",
        "message": "High risk detected due to elevated heart rate.",
    }
    resp = await client.post("/api/v1/alerts/", json=payload)

    assert resp.status_code == 201
    assert resp.json()["severity"] == "HIGH"
    mock_alert_service.create_alert.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_alert_missing_required_field_returns_422(client, mock_alert_service):
    resp = await client.post("/api/v1/alerts/", json={"type": "Risk", "severity": "HIGH"})
    assert resp.status_code == 422
    mock_alert_service.create_alert.assert_not_awaited()


# ---- get_alerts ----

@pytest.mark.asyncio
async def test_get_alerts_no_filters(client, mock_alert_service):
    mock_alert_service.get_alerts.return_value = [make_alert(), make_alert()]

    resp = await client.get("/api/v1/alerts/")

    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_get_alerts_with_filters_passes_through_to_service(client, mock_alert_service):
    user_id = uuid4()
    mock_alert_service.get_alerts.return_value = [make_alert(user_id, severity="HIGH")]

    resp = await client.get(f"/api/v1/alerts/?user_id={user_id}&severity=HIGH&sort_by=asc&skip=0&limit=50")

    assert resp.status_code == 200
    mock_alert_service.get_alerts.assert_awaited_once()
    _, kwargs = mock_alert_service.get_alerts.call_args
    assert kwargs["user_id"] == user_id
    assert kwargs["severity"] == "HIGH"
    assert kwargs["sort_by"] == "asc"


@pytest.mark.asyncio
async def test_get_alerts_invalid_sort_by_returns_422(client, mock_alert_service):
    resp = await client.get("/api/v1/alerts/?sort_by=nope")
    assert resp.status_code == 422


# ---- delete_alert ----

@pytest.mark.asyncio
async def test_delete_alert_success(client, mock_alert_service):
    alert_id = uuid4()
    mock_alert_service.delete_alert.return_value = None

    resp = await client.delete(f"/api/v1/alerts/{alert_id}")

    assert resp.status_code == 204
    mock_alert_service.delete_alert.assert_awaited_once_with(alert_id)


@pytest.mark.asyncio
async def test_delete_alert_not_found_returns_404(client, mock_alert_service):
    mock_alert_service.delete_alert.side_effect = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Alert with id ... not found"
    )

    resp = await client.delete(f"/api/v1/alerts/{uuid4()}")

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_alert_invalid_uuid_returns_422(client, mock_alert_service):
    resp = await client.delete("/api/v1/alerts/not-a-uuid")
    assert resp.status_code == 422
    mock_alert_service.delete_alert.assert_not_awaited()


# ---- confirm_alert (feedback) ----

@pytest.mark.asyncio
async def test_confirm_alert_success(client, mock_alert_service):
    alert_id = uuid4()
    mock_alert_service.confirm_alert.return_value = make_alert(severity="HIGH")
    mock_alert_service.confirm_alert.return_value["user_confirmed"] = True

    resp = await client.patch(f"/api/v1/alerts/{alert_id}/feedback", json={"confirmed": True})

    assert resp.status_code == 200
    assert resp.json()["user_confirmed"] is True
    mock_alert_service.confirm_alert.assert_awaited_once_with(alert_id, True)


@pytest.mark.asyncio
async def test_confirm_alert_false_positive(client, mock_alert_service):
    alert_id = uuid4()
    mock_alert_service.confirm_alert.return_value = make_alert(severity="HIGH")
    mock_alert_service.confirm_alert.return_value["user_confirmed"] = False

    resp = await client.patch(f"/api/v1/alerts/{alert_id}/feedback", json={"confirmed": False})

    assert resp.status_code == 200
    assert resp.json()["user_confirmed"] is False
    mock_alert_service.confirm_alert.assert_awaited_once_with(alert_id, False)


@pytest.mark.asyncio
async def test_confirm_alert_not_found_returns_404(client, mock_alert_service):
    mock_alert_service.confirm_alert.side_effect = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Alert with id ... not found"
    )

    resp = await client.patch(f"/api/v1/alerts/{uuid4()}/feedback", json={"confirmed": True})

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_confirm_alert_missing_body_returns_422(client, mock_alert_service):
    resp = await client.patch(f"/api/v1/alerts/{uuid4()}/feedback", json={})
    assert resp.status_code == 422
    mock_alert_service.confirm_alert.assert_not_awaited()
