import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from app.schemas.alert import AlertCreate, AlertResponse
from app.repositories.alert_repository import AlertRepository

class AlertService:
    """Service layer for Alert business logic."""

    def __init__(self, alert_repository: AlertRepository):
        self.alert_repository = alert_repository

    async def create_alert(self, data_in: AlertCreate) -> AlertResponse:
        """Process and create a new alert."""
        new_alert = await self.alert_repository.create(data_in)
        return AlertResponse.model_validate(new_alert)

    async def get_alerts(
        self,
        user_id: Optional[uuid.UUID] = None,
        severity: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "desc"
    ) -> List[AlertResponse]:
        """Get alerts with optional filters."""
        alerts = await self.alert_repository.get_alerts(
            user_id=user_id,
            severity=severity,
            start_date=start_date,
            end_date=end_date,
            skip=skip,
            limit=limit,
            sort_by=sort_by
        )
        return [AlertResponse.model_validate(alert) for alert in alerts]

    async def delete_alert(self, alert_id: uuid.UUID) -> None:
        """Delete an alert by ID."""
        deleted = await self.alert_repository.delete(alert_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert with id {alert_id} not found"
            )
