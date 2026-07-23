from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

class AlertBase(BaseModel):
    """Base validation schema for Alert."""
    user_id: UUID
    type: str
    severity: str
    message: str
    is_resolved: bool = False

class AlertCreate(AlertBase):
    """Schema for creating a new Alert."""
    pass

class AlertUpdate(BaseModel):
    """Schema for updating an existing Alert."""
    type: Optional[str] = None
    severity: Optional[str] = None
    message: Optional[str] = None
    is_resolved: Optional[bool] = None

class AlertFeedback(BaseModel):
    """Schema for confirming or dismissing an alert as accurate."""
    confirmed: bool

class AlertResponse(AlertBase):
    """Response schema for Alert."""
    id: UUID
    user_confirmed: Optional[bool] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
