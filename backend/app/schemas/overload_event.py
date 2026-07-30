from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

class OverloadEventBase(BaseModel):
    """Base validation schema for OverloadEvent."""
    user_id: UUID
    trigger_metric: str
    trigger_value: float
    duration_seconds: int

class OverloadEventCreate(OverloadEventBase):
    """Schema for creating a new OverloadEvent."""
    pass

class OverloadEventUpdate(BaseModel):
    """Schema for updating an existing OverloadEvent."""
    trigger_metric: Optional[str] = None
    trigger_value: Optional[float] = None
    duration_seconds: Optional[int] = None

class OverloadEventResponse(OverloadEventBase):
    """Response schema for OverloadEvent."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
