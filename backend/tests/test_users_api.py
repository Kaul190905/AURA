import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi import status

from app.main import app
from app.api.dependencies.services import get_user_service
from app.core.exceptions import AURAException, NotFoundException


@pytest.fixture
def mock_user_service():
    service = AsyncMock()
    app.dependency_overrides[get_user_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_user_service, None)


def make_user(user_id=None, email="test@example.com", is_active=True):
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(user_id or uuid4()),
        "email": email,
        "is_active": is_active,
        "created_at": now,
        "updated_at": now,
        "preferences": None,
    }


# ---- create_user ----

@pytest.mark.asyncio
async def test_create_user_success(client, mock_user_service):
    mock_user_service.create_user.return_value = make_user(email="new@example.com")

    resp = await client.post("/api/v1/users/", json={"email": "new@example.com", "is_active": True})

    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()["email"] == "new@example.com"
    mock_user_service.create_user.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_user_duplicate_email_returns_400(client, mock_user_service):
    mock_user_service.create_user.side_effect = AURAException(
        message="User with email dup@example.com already exists",
        status_code=status.HTTP_400_BAD_REQUEST,
    )

    resp = await client.post("/api/v1/users/", json={"email": "dup@example.com"})

    assert resp.status_code == 400
    assert "already exists" in resp.json()["message"]


@pytest.mark.asyncio
async def test_create_user_invalid_email_returns_422(client, mock_user_service):
    resp = await client.post("/api/v1/users/", json={"email": "not-an-email"})
    assert resp.status_code == 422
    mock_user_service.create_user.assert_not_awaited()


# ---- get_user ----

@pytest.mark.asyncio
async def test_get_user_success(client, override_auth, mock_user_service):
    user_id = override_auth.id
    mock_user_service.get_user_by_id.return_value = make_user(user_id)

    resp = await client.get(f"/api/v1/users/{user_id}")

    assert resp.status_code == 200
    assert resp.json()["id"] == str(user_id)


@pytest.mark.asyncio
async def test_get_user_not_found_returns_404(client, override_auth, mock_user_service):
    user_id = override_auth.id
    mock_user_service.get_user_by_id.side_effect = NotFoundException(
        message=f"User with id {user_id} not found"
    )

    resp = await client.get(f"/api/v1/users/{user_id}")

    assert resp.status_code == 404


# ---- update_user ----

@pytest.mark.asyncio
async def test_update_user_success(client, override_auth, mock_user_service):
    user_id = override_auth.id
    mock_user_service.update_user.return_value = make_user(user_id, email="updated@example.com")

    resp = await client.put(f"/api/v1/users/{user_id}", json={"email": "updated@example.com"})

    assert resp.status_code == 200
    assert resp.json()["email"] == "updated@example.com"


@pytest.mark.asyncio
async def test_update_user_email_conflict_returns_400(client, override_auth, mock_user_service):
    user_id = override_auth.id
    mock_user_service.update_user.side_effect = AURAException(
        message="Email taken@example.com is already in use by another account",
        status_code=status.HTTP_400_BAD_REQUEST,
    )

    resp = await client.put(f"/api/v1/users/{user_id}", json={"email": "taken@example.com"})

    assert resp.status_code == 400


# ---- delete_user ----

@pytest.mark.asyncio
async def test_delete_user_success(client, override_auth, mock_user_service):
    user_id = override_auth.id
    mock_user_service.delete_user.return_value = True

    resp = await client.delete(f"/api/v1/users/{user_id}")

    assert resp.status_code == 204
    mock_user_service.delete_user.assert_awaited_once_with(user_id)


@pytest.mark.asyncio
async def test_delete_user_not_found_returns_404(client, override_auth, mock_user_service):
    user_id = override_auth.id
    mock_user_service.delete_user.side_effect = NotFoundException(
        message=f"User with id {user_id} not found"
    )

    resp = await client.delete(f"/api/v1/users/{user_id}")

    assert resp.status_code == 404


# ---- authenticated "me"/"profile"/"preferences" routes ----

@pytest.mark.asyncio
async def test_get_my_profile_returns_supabase_identity(client, override_auth):
    resp = await client.get("/api/v1/users/me")

    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == override_auth.email
    assert body["id"] == str(override_auth.id)


@pytest.mark.asyncio
async def test_get_profile_uses_authenticated_user_id(client, override_auth, mock_user_service):
    mock_user_service.get_user_by_id.return_value = make_user(override_auth.id, override_auth.email)

    resp = await client.get("/api/v1/users/profile")

    assert resp.status_code == 200
    mock_user_service.get_user_by_id.assert_awaited_once_with(override_auth.id)


@pytest.mark.asyncio
async def test_update_profile_requires_auth(client, mock_user_service):
    resp = await client.put("/api/v1/users/profile", json={"email": "x@example.com"})
    assert resp.status_code == 401
    mock_user_service.update_user.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_profile_success(client, override_auth, mock_user_service):
    mock_user_service.update_user.return_value = make_user(override_auth.id, "changed@example.com")

    resp = await client.put("/api/v1/users/profile", json={"email": "changed@example.com"})

    assert resp.status_code == 200
    assert resp.json()["email"] == "changed@example.com"
    mock_user_service.update_user.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_preferences_success(client, override_auth, mock_user_service):
    now = datetime.now(timezone.utc).isoformat()
    mock_user_service.update_user_preferences.return_value = {
        "id": str(uuid4()),
        "user_id": str(override_auth.id),
        "preferred_noise": 55.0,
        "preferred_temperature": 21.0,
        "preferred_places": None,
        "trigger_foods": None,
        "notification_settings": None,
        "ai_settings": None,
        "created_at": now,
        "updated_at": now,
    }

    resp = await client.put("/api/v1/users/preferences", json={"preferred_noise": 55.0})

    assert resp.status_code == 200
    assert resp.json()["preferred_noise"] == 55.0
    mock_user_service.update_user_preferences.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_preferences_requires_auth(client, mock_user_service):
    resp = await client.put("/api/v1/users/preferences", json={"preferred_noise": 55.0})
    assert resp.status_code == 401
