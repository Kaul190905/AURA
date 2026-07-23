import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models.wellness_checkin import WellnessCheckin
from app.schemas.wellness import WellnessCheckinCreate

class WellnessCheckinRepository:
    """Repository for managing WellnessCheckin persistence operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: uuid.UUID, data_in: WellnessCheckinCreate) -> WellnessCheckin:
        """Record a new self-reported wellness check-in."""
        data_dict = data_in.model_dump()
        data_dict["user_id"] = user_id
        new_checkin = WellnessCheckin(**data_dict)
        self.db.add(new_checkin)
        await self.db.commit()
        await self.db.refresh(new_checkin)
        return new_checkin

    async def get_recent(
        self,
        user_id: uuid.UUID,
        start_date: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[WellnessCheckin]:
        """Fetch a user's recent check-ins, most recent first."""
        query = select(WellnessCheckin).where(WellnessCheckin.user_id == user_id)
        if start_date:
            query = query.where(WellnessCheckin.created_at >= start_date)
        query = query.order_by(desc(WellnessCheckin.created_at)).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())
