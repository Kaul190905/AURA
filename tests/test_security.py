import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.security import get_current_user


def _credentials(token: str = "sometoken") -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


@pytest.mark.asyncio
async def test_get_current_user_valid_token_returns_user():
    mock_user = MagicMock()
    mock_response = MagicMock(user=mock_user)
    mock_client = MagicMock()
    mock_client.auth.get_user.return_value = mock_response

    with patch("app.core.security.get_supabase_client", return_value=mock_client):
        result = await get_current_user(_credentials("valid-token"))

    assert result is mock_user
    mock_client.auth.get_user.assert_called_once_with("valid-token")


@pytest.mark.asyncio
async def test_get_current_user_no_user_in_response_raises_401():
    mock_response = MagicMock(user=None)
    mock_client = MagicMock()
    mock_client.auth.get_user.return_value = mock_response

    with patch("app.core.security.get_supabase_client", return_value=mock_client):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(_credentials("bad-token"))

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_none_response_raises_401():
    mock_client = MagicMock()
    mock_client.auth.get_user.return_value = None

    with patch("app.core.security.get_supabase_client", return_value=mock_client):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(_credentials("bad-token"))

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_expired_token_raises_401_with_message():
    mock_client = MagicMock()
    mock_client.auth.get_user.side_effect = Exception("Token has expired")

    with patch("app.core.security.get_supabase_client", return_value=mock_client):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(_credentials("expired-token"))

    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_get_current_user_generic_failure_raises_401():
    mock_client = MagicMock()
    mock_client.auth.get_user.side_effect = Exception("network unreachable")

    with patch("app.core.security.get_supabase_client", return_value=mock_client):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(_credentials("bad-token"))

    assert exc_info.value.status_code == 401
    assert "could not validate credentials" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_protected_route_without_authorization_header_is_rejected(client):
    resp = await client.get("/api/v1/users/me")
    # HTTPBearer's auto_error behavior raises 401 "Not authenticated" when no header is present.
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_with_malformed_header_is_rejected(client):
    resp = await client.get("/api/v1/users/me", headers={"Authorization": "NotBearer sometoken"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_with_overridden_auth_succeeds(client, override_auth):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == override_auth.email
