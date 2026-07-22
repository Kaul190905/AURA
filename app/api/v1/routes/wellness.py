from fastapi import APIRouter, Depends, status
from uuid import UUID

from app.schemas.wellness import WellnessCheckinCreate, WellnessCheckinResponse, WellnessScoreResponse
from app.services.wellness_service import WellnessService
from app.api.dependencies.services import get_wellness_service

router = APIRouter()


@router.post(
    "/{user_id}/checkins",
    response_model=WellnessCheckinResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a Wellness Check-in",
)
async def submit_checkin(
    user_id: UUID,
    data_in: WellnessCheckinCreate,
    wellness_service: WellnessService = Depends(get_wellness_service),
):
    """
    Record a self-reported wellness check-in (0-100 mood score, optional
    notes). This is the ground-truth signal the ML WellnessEngine's
    `--mode live` training run consumes — see
    app/ai/ml/training/train_wellness_model.py.
    """
    return await wellness_service.submit_checkin(user_id, data_in)


@router.get("/{user_id}/score", response_model=WellnessScoreResponse, summary="Get Aggregate Wellness Score")
async def get_wellness_score(
    user_id: UUID,
    wellness_service: WellnessService = Depends(get_wellness_service),
):
    """
    Compute the user's current aggregate wellness score (0-100), combining
    physical (risk), mental (self-report), and stability (anomaly rate)
    signals. Uses the ML-backed engine when USE_ML_WELLNESS_ENGINE is
    enabled and a trained model exists, otherwise the deterministic
    rule-based formula.
    """
    return await wellness_service.get_score(user_id)
