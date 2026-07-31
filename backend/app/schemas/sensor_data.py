from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class SensorDataBase(BaseModel):
    """Base validation schema for SensorData with strict physiological bounds."""
    timestamp: Optional[datetime] = None
    heart_rate: Optional[float] = Field(None, ge=30, le=250, description="Heart rate in BPM (30-250)")
    blood_oxygen: Optional[float] = Field(None, ge=50, le=100, description="Blood oxygen SpO2 % (50-100)")
    temperature: Optional[float] = Field(None, ge=0, le=140, description="Ambient/body temperature (0-140)")
    noise: Optional[float] = Field(None, ge=0, le=160, description="Noise level in dBA (0-160)")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Geographic latitude")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Geographic longitude")

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

