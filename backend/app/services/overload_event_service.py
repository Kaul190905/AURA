import uuid
from datetime import datetime
from typing import List, Optional

from app.schemas.overload_event import OverloadEventCreate, OverloadEventResponse
from app.repositories.overload_event_repository import OverloadEventRepository

class OverloadEventService:
    """Service layer for OverloadEvent business logic."""

    def __init__(self, overload_event_repository: OverloadEventRepository):
        self.overload_event_repository = overload_event_repository

    async def create_event(self, data_in: OverloadEventCreate) -> OverloadEventResponse:
        """Log a confirmed overload event."""
        new_event = await self.overload_event_repository.create(data_in)
        return OverloadEventResponse.model_validate(new_event)

    async def get_events(
        self,
        user_id: Optional[uuid.UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "desc",
    ) -> List[OverloadEventResponse]:
        """Get overload events with optional filters."""
        events = await self.overload_event_repository.get_events(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
        )
        return [OverloadEventResponse.model_validate(e) for e in events]
