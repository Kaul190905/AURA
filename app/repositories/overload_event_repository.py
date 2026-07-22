import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models.overload_event import OverloadEvent
from app.schemas.overload_event import OverloadEventCreate

class OverloadEventRepository:
    """
    Repository for managing OverloadEvent persistence operations.

    This table was migrated from day one but had no writer until now — it's
    the real-world ground truth PredictionEngine's `--mode live` training
    run consumes (see app/ai/ml/training/train_prediction_model.py).
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data_in: OverloadEventCreate) -> OverloadEvent:
        """Log a confirmed overload event."""
        data_dict = data_in.model_dump()
        new_event = OverloadEvent(**data_dict)
        self.db.add(new_event)
        await self.db.commit()
        await self.db.refresh(new_event)
        return new_event

    async def get_events(
        self,
        user_id: Optional[uuid.UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "desc",
    ) -> List[OverloadEvent]:
        """Get overload events with filtering, pagination, and sorting."""
        query = select(OverloadEvent)

        if user_id:
            query = query.where(OverloadEvent.user_id == user_id)
        if start_date:
            query = query.where(OverloadEvent.created_at >= start_date)
        if end_date:
            query = query.where(OverloadEvent.created_at <= end_date)

        if sort_by.lower() == "asc":
            query = query.order_by(asc(OverloadEvent.created_at))
        else:
            query = query.order_by(desc(OverloadEvent.created_at))

        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())
