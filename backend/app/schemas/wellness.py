from pydantic import BaseModel, ConfigDict, Field
from typing import Dict, Optional
from uuid import UUID
from datetime import datetime


class WellnessCheckinCreate(BaseModel):
    """Schema for submitting a self-reported wellness check-in."""
    mood_score: float = Field(..., ge=0, le=100, description="Self-reported wellness, 0-100")
    notes: Optional[str] = None


class WellnessCheckinResponse(BaseModel):
    id: UUID
    user_id: UUID
    mood_score: float
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WellnessScoreResponse(BaseModel):
    user_id: UUID
    wellness_score: int
    components: Dict[str, float]
    method: str


class WellnessBreakdownResponse(BaseModel):
    status: str
    breakdown: Optional[Dict[str, float]] = None
    overall: Optional[int] = None
    method: Optional[str] = None
