from fastapi import APIRouter, Depends, Query, status
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.schemas.sensor_data import SensorDataCreate, SensorDataResponse, SensorDataAnalysisResponse
from app.services.sensor_data_service import SensorDataService
from app.api.dependencies.services import get_sensor_data_service
from app.core.security import get_current_user
from app.core.biometric_firewall import inspect_telemetry_payload
from app.api.v1.routes.caregivers import manager

router = APIRouter()

@router.post("/", response_model=SensorDataAnalysisResponse, status_code=status.HTTP_201_CREATED, summary="Submit Sensor Data")
async def submit_sensor_data(
    data_in: SensorDataCreate,
    current_user = Depends(get_current_user),
    sensor_data_service: SensorDataService = Depends(get_sensor_data_service)
):
    """
    Submit new sensor data (e.g. noise, temperature, heart_rate, latitude, longitude).
    """
    user_id_to_use = current_user.id
    
    # ── AI Biometric Spoofing & Anomaly Inspection Firewall ───────────────
    inspect_telemetry_payload(user_id_to_use, data_in)

    analysis = await sensor_data_service.create_sensor_data(user_id_to_use, data_in)
    
    # Broadcast live sensor data to caregivers
    await manager.broadcast_to_caregivers(user_id_to_use, {
        "type": "SENSOR_DATA",
        "data": analysis.sensor_data.model_dump(mode="json")
    })
    
    return analysis

@router.get("/history", response_model=List[SensorDataResponse], summary="Get Sensor Data History")
async def get_sensor_data_history(
    user_id: Optional[UUID] = Query(None, description="Filter by User ID"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    skip: int = Query(0, ge=0, description="Pagination skip"),
    limit: int = Query(100, ge=1, le=1000, description="Pagination limit"),
    sort_by: str = Query("desc", pattern="^(asc|desc)$", description="Sort by timestamp (asc/desc)"),
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
