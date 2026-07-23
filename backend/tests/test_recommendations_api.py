import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from app.main import app
from app.api.dependencies.services import get_recommendation_service


@pytest.fixture
def mock_recommendation_service():
    service = AsyncMock()
    app.dependency_overrides[get_recommendation_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_recommendation_service, None)


@pytest.mark.asyncio
async def test_get_recommendations_success(client, mock_recommendation_service):
    user_id = uuid4()
    mock_recommendation_service.get_personalized_recommendations.return_value = {
        "user_id": user_id,
        "risk_score": 45.0,
        "risk_level": "MEDIUM",
        "recommendations": ["Take a short break in a quieter space."],
        "method": "RecommendationEngine",
    }

    resp = await client.get(f"/api/v1/recommendations/{user_id}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["risk_level"] == "MEDIUM"
    assert body["method"] == "RecommendationEngine"
    mock_recommendation_service.get_personalized_recommendations.assert_awaited_once_with(user_id)


@pytest.mark.asyncio
async def test_get_recommendations_reports_ai_method_when_used(client, mock_recommendation_service):
    user_id = uuid4()
    mock_recommendation_service.get_personalized_recommendations.return_value = {
        "user_id": user_id,
        "risk_score": 80.0,
        "risk_level": "HIGH",
        "recommendations": ["Your surroundings are loud right now — noise-cancelling headphones could help."],
        "method": "AIRecommendationEngine",
    }

    resp = await client.get(f"/api/v1/recommendations/{user_id}")

    assert resp.status_code == 200
    assert resp.json()["method"] == "AIRecommendationEngine"


@pytest.mark.asyncio
async def test_get_recommendations_empty_when_calm(client, mock_recommendation_service):
    user_id = uuid4()
    mock_recommendation_service.get_personalized_recommendations.return_value = {
        "user_id": user_id,
        "risk_score": 0.0,
        "risk_level": "LOW",
        "recommendations": [],
        "method": "RecommendationEngine",
    }

    resp = await client.get(f"/api/v1/recommendations/{user_id}")

    assert resp.status_code == 200
    assert resp.json()["recommendations"] == []


@pytest.mark.asyncio
async def test_get_recommendations_invalid_user_id_returns_422(client, mock_recommendation_service):
    resp = await client.get("/api/v1/recommendations/not-a-uuid")
    assert resp.status_code == 422
    mock_recommendation_service.get_personalized_recommendations.assert_not_awaited()
