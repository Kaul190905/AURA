from fastapi import APIRouter, Depends
from uuid import UUID

from app.schemas.recommendation import PersonalizedRecommendationResponse
from app.services.recommendation_service import RecommendationService
from app.api.dependencies.services import get_recommendation_service

router = APIRouter()


@router.get(
    "/{user_id}",
    response_model=PersonalizedRecommendationResponse,
    summary="Get On-Demand Recommendations",
)
async def get_recommendations(
    user_id: UUID,
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
):
    """
    Compute recommendations from the user's latest telemetry, on demand.

    Uses the AI-phrased engine when USE_AI_RECOMMENDATION_ENGINE is enabled
    and ANTHROPIC_API_KEY is set — a deterministic rule engine (rules.json)
    still decides which categories are eligible; the LLM only rephrases them
    personally. Falls back to plain rule-based text if the LLM is
    unavailable or misconfigured.

    Deliberately NOT called during sensor-data ingestion (that stays on the
    fast, free rule-based engine) — this is a separate, on-demand read so
    LLM cost/latency is only paid when a user actually asks for guidance.
    """
    return await recommendation_service.get_personalized_recommendations(user_id)
