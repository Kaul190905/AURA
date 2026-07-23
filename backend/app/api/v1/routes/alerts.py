from fastapi import APIRouter, Depends, Query, status
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.schemas.alert import AlertCreate, AlertResponse, AlertFeedback
from app.services.alert_service import AlertService
from app.api.dependencies.services import get_alert_service

router = APIRouter()

@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED, summary="Create Alert")
async def create_alert(
    data_in: AlertCreate,
    alert_service: AlertService = Depends(get_alert_service)
):
    """
    Create a new alert.
    """
    return await alert_service.create_alert(data_in)

@router.get("/", response_model=List[AlertResponse], summary="Get Alerts")
async def get_alerts(
    user_id: Optional[UUID] = Query(None, description="Filter by User ID"),
    severity: Optional[str] = Query(None, description="Filter by severity (e.g., info, warning, critical)"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    skip: int = Query(0, ge=0, description="Pagination skip"),
    limit: int = Query(100, ge=1, le=1000, description="Pagination limit"),
    sort_by: str = Query("desc", regex="^(asc|desc)$", description="Sort by timestamp (asc/desc)"),
    alert_service: AlertService = Depends(get_alert_service)
):
    """
    Retrieve alerts with optional filters, pagination, and sorting.
    """
    return await alert_service.get_alerts(
        user_id=user_id,
        severity=severity,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
        sort_by=sort_by
    )

@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Alert")
async def delete_alert(
    alert_id: UUID,
    alert_service: AlertService = Depends(get_alert_service)
):
    """
    Delete a specific alert by ID.
    """
    await alert_service.delete_alert(alert_id)

@router.patch("/{alert_id}/feedback", response_model=AlertResponse, summary="Confirm or Dismiss an Alert")
async def submit_alert_feedback(
    alert_id: UUID,
    feedback: AlertFeedback,
    alert_service: AlertService = Depends(get_alert_service)
):
    """
    Record whether an alert was accurate (confirmed=true) or a false positive
    (confirmed=false). This is the ground-truth signal the ML RiskEngine's
    `--mode live` training run consumes (see
    app/ai/ml/training/train_risk_model.py).
    """
    return await alert_service.confirm_alert(alert_id, feedback.confirmed)
