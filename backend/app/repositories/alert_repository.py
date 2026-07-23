import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select, desc, asc, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models.alert import Alert
from app.schemas.alert import AlertCreate

class AlertRepository:
    """Repository for managing Alert persistence operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def create(self, data_in: AlertCreate) -> Alert:
        """Create a new alert record."""
        data_dict = data_in.model_dump()
        new_alert = Alert(**data_dict)
        self.db.add(new_alert)
        await self.db.commit()
        await self.db.refresh(new_alert)
        return new_alert

    async def get_alerts(
        self,
        user_id: Optional[uuid.UUID] = None,
        severity: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "desc"
    ) -> List[Alert]:
        """
        Get alerts with filtering, pagination, and sorting.
        """
        query = select(Alert)
        
        # Filtering
        if user_id:
            query = query.where(Alert.user_id == user_id)
        if severity:
            query = query.where(Alert.severity == severity)
        if start_date:
            query = query.where(Alert.created_at >= start_date)
        if end_date:
            query = query.where(Alert.created_at <= end_date)
            
        # Sorting
        if sort_by.lower() == "asc":
            query = query.order_by(asc(Alert.created_at))
        else:
            query = query.order_by(desc(Alert.created_at))
            
        # Pagination
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def delete(self, alert_id: uuid.UUID) -> bool:
        """Delete an alert by ID."""
        query = delete(Alert).where(Alert.id == alert_id)
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0

    async def confirm(self, alert_id: uuid.UUID, confirmed: bool) -> Optional[Alert]:
        """Record user feedback on whether an alert was accurate — the labeled
        signal the ML RiskEngine's `--mode live` training run consumes."""
        stmt = select(Alert).where(Alert.id == alert_id)
        result = await self.db.execute(stmt)
        alert = result.scalars().first()
        if not alert:
            return None

        alert.user_confirmed = confirmed
        alert.confirmed_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(alert)
        return alert
