from fastapi import APIRouter, Depends, Query, status
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.schemas.sensor_data import SensorDataCreate, SensorDataResponse
from app.services.sensor_data_service import SensorDataService
from app.api.dependencies.services import get_sensor_data_service
from app.core.security import get_current_user

router = APIRouter()

@router.post("/", response_model=SensorDataResponse, status_code=status.HTTP_201_CREATED, summary="Submit Sensor Data")
async def submit_sensor_data(
    data_in: SensorDataCreate,
    # TODO: RESTORE AUTHENTICATION BEFORE PRODUCTION DEPLOYMENT
    # current_user = Depends(get_current_user),
    dev_user_id: Optional[UUID] = Query(None, description="DEV ONLY: Use this user ID when auth is disabled"),
    sensor_data_service: SensorDataService = Depends(get_sensor_data_service)
):
    """
    Submit new sensor data (e.g. noise, temperature, heart_rate, latitude, longitude).
    """
    import uuid
    # Temporarily using the provided dev_user_id or a generated dummy UUID since authentication is disabled for development
    user_id_to_use = dev_user_id if dev_user_id else uuid.uuid4()
    return await sensor_data_service.create_sensor_data(user_id_to_use, data_in)

@router.get("/history", response_model=List[SensorDataResponse], summary="Get Sensor Data History")
async def get_sensor_data_history(
    user_id: Optional[UUID] = Query(None, description="Filter by User ID"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    skip: int = Query(0, ge=0, description="Pagination skip"),
    limit: int = Query(100, ge=1, le=1000, description="Pagination limit"),
    sort_by: str = Query("desc", regex="^(asc|desc)$", description="Sort by timestamp (asc/desc)"),
    sensor_data_service: SensorDataService = Depends(get_sensor_data_service)
):
    """
    Retrieve historical sensor data with optional filters, pagination, and sorting.
    """
    return await sensor_data_service.get_history(
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
        sort_by=sort_by
    )
