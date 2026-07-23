from fastapi import APIRouter, Depends, Query, status
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.schemas.overload_event import OverloadEventCreate, OverloadEventResponse
from app.services.overload_event_service import OverloadEventService
from app.api.dependencies.services import get_overload_event_service

router = APIRouter()


@router.post("/", response_model=OverloadEventResponse, status_code=status.HTTP_201_CREATED, summary="Log an Overload Event")
async def create_overload_event(
    data_in: OverloadEventCreate,
    overload_event_service: OverloadEventService = Depends(get_overload_event_service)
):
    """
    Log a confirmed overload event (trigger metric, value, and duration).

    This is the real-world ground truth the ML PredictionEngine's
    `--mode live` training run consumes — see
    app/ai/ml/training/train_prediction_model.py. This table existed since
    the initial schema but had no writer until this endpoint.
    """
    return await overload_event_service.create_event(data_in)


@router.get("/", response_model=List[OverloadEventResponse], summary="Get Overload Events")
async def get_overload_events(
    user_id: Optional[UUID] = Query(None, description="Filter by User ID"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    skip: int = Query(0, ge=0, description="Pagination skip"),
    limit: int = Query(100, ge=1, le=1000, description="Pagination limit"),
    sort_by: str = Query("desc", pattern="^(asc|desc)$", description="Sort by timestamp (asc/desc)"),
    overload_event_service: OverloadEventService = Depends(get_overload_event_service)
):
    """
    Retrieve logged overload events with optional filters, pagination, and sorting.
    """
    return await overload_event_service.get_events(
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
        sort_by=sort_by
    )
