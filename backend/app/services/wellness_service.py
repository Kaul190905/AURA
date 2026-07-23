from typing import Any, Dict
from uuid import UUID

from app.ai.wellness_engine import IWellnessEngine
from app.repositories.wellness_checkin_repository import WellnessCheckinRepository
from app.schemas.wellness import WellnessCheckinCreate, WellnessCheckinResponse


class WellnessService:
    """Service layer for wellness check-ins and aggregate wellness scoring."""

    def __init__(self, wellness_checkin_repo: WellnessCheckinRepository, wellness_engine: IWellnessEngine):
        self.wellness_checkin_repo = wellness_checkin_repo
        self.wellness_engine = wellness_engine

    async def submit_checkin(self, user_id: UUID, data_in: WellnessCheckinCreate) -> WellnessCheckinResponse:
        """Record a user's self-reported wellness — the ground-truth signal
        the ML WellnessEngine's `--mode live` training run consumes."""
        checkin = await self.wellness_checkin_repo.create(user_id, data_in)
        return WellnessCheckinResponse.model_validate(checkin)

    async def get_score(self, user_id: UUID) -> Dict[str, Any]:
        """Compute the current aggregate wellness score and its components."""
        breakdown = await self.wellness_engine.get_wellness_breakdown(user_id)
        overall = breakdown.pop("overall", None)
        method = type(self.wellness_engine).__name__
        return {
            "user_id": user_id,
            "wellness_score": int(overall) if overall is not None else 0,
            "components": breakdown,
            "method": method,
        }
