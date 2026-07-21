from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

class SensorDataBase(BaseModel):
    """Base validation schema for SensorData."""
    timestamp: Optional[datetime] = None
    heart_rate: Optional[float] = None
    blood_oxygen: Optional[float] = None
    temperature: Optional[float] = None
    noise: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class SensorDataCreate(SensorDataBase):
    """Schema for creating new SensorData."""
    pass

class SensorDataUpdate(BaseModel):
    """Schema for updating SensorData."""
    heart_rate: Optional[float] = None
    blood_oxygen: Optional[float] = None
    temperature: Optional[float] = None
    noise: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class SensorDataResponse(SensorDataBase):
    """Response schema for SensorData."""
    id: UUID
    user_id: UUID
    timestamp: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SensorDataAnalysisResponse(BaseModel):
    """Aggregated response containing telemetry, risk analysis, and recommendations."""
    sensor_data: SensorDataResponse
    risk_score: float
    risk_level: str
    reasons: list[str]
    recommendations: list[str]

