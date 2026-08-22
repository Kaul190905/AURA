import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from app.schemas.alert import AlertCreate, AlertResponse
from app.repositories.alert_repository import AlertRepository

from sqlalchemy import select
import httpx
from app.domain.models.caregiver import CaregiverAssignment
from app.domain.models.push_token import UserPushToken

class AlertService:
    """Service layer for Alert business logic."""

    def __init__(self, alert_repository: AlertRepository):
        self.alert_repository = alert_repository

    async def create_alert(self, data_in: AlertCreate) -> AlertResponse:
        """Process and create a new alert."""
        new_alert = await self.alert_repository.create(data_in)
        alert_resp = AlertResponse.model_validate(new_alert)

        if data_in.severity in ("HIGH", "critical"):
            try:
                # Local import to avoid circular dependencies
                from app.api.v1.routes.caregivers import manager
                # 1. Broadcast via WebSocket
                await manager.broadcast_to_caregivers(uuid.UUID(data_in.user_id), {
                    "type": "SOS_ALERT" if data_in.type == "SOS" else "CRITICAL_ALERT",
                    "alert": alert_resp.model_dump(mode="json")
                })
                
                # 2. Send Expo Push Notifications
                db = self.alert_repository.db
                cg_result = await db.execute(
                    select(CaregiverAssignment.caregiver_id)
                    .where(CaregiverAssignment.user_id == uuid.UUID(data_in.user_id))
                    .where(CaregiverAssignment.status == "active")
                )
                caregiver_ids = cg_result.scalars().all()

                if caregiver_ids:
                    token_result = await db.execute(
                        select(UserPushToken.token)
                        .where(UserPushToken.user_id.in_(caregiver_ids))
                    )
                    tokens = token_result.scalars().all()

                    if tokens:
                        messages = []
                        title = "🚨 EMERGENCY SOS 🚨" if data_in.type == "SOS" else "🚨 CRITICAL ALERT 🚨"
                        for token in tokens:
                            messages.append({
                                "to": token,
                                "sound": "default",
                                "title": title,
                                "body": data_in.message,
                                "data": {"type": "SOS_ALERT" if data_in.type == "SOS" else "CRITICAL_ALERT", "user_id": data_in.user_id}
                            })
                        
                        async with httpx.AsyncClient() as client:
                            await client.post("https://exp.host/--/api/v2/push/send", json=messages)
            except Exception as e:
                print(f"Failed to dispatch alert notifications: {e}")

        return alert_resp

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

    async def confirm_alert(self, alert_id: uuid.UUID, confirmed: bool) -> AlertResponse:
        """Record whether an alert was accurate or a false positive."""
        alert = await self.alert_repository.confirm(alert_id, confirmed)
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert with id {alert_id} not found"
            )
        return AlertResponse.model_validate(alert)
