import pytest
from typing import AsyncGenerator
from unittest.mock import MagicMock
from uuid import uuid4

from httpx import AsyncClient, ASGITransport

import os
os.environ["IS_TESTING"] = "1"

from app.main import app
from app.core.security import get_current_user


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def mock_supabase_user() -> MagicMock:
    """A stand-in for the Supabase `User` object returned by `get_current_user`."""
    user = MagicMock()
    user.id = uuid4()
    user.email = "test@example.com"
    user.user_metadata = {}
    user.last_sign_in_at = None
    return user


@pytest.fixture
def override_auth(mock_supabase_user: MagicMock) -> MagicMock:
    """Bypass Supabase JWT validation and inject a fake authenticated user."""
    async def _get_current_user_override():
        return mock_supabase_user

    app.dependency_overrides[get_current_user] = _get_current_user_override
    yield mock_supabase_user
    app.dependency_overrides.pop(get_current_user, None)
