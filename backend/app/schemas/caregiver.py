from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr

class CaregiverBase(BaseModel):
    can_view_preferences: bool = False
    can_view_speech_diary: bool = False

class CaregiverInviteRequest(BaseModel):
    email: EmailStr

class CaregiverUpdate(BaseModel):
    can_view_preferences: Optional[bool] = None
    can_view_speech_diary: Optional[bool] = None

class CaregiverResponse(CaregiverBase):
    id: UUID
    user_id: UUID
    caregiver_id: Optional[UUID] = None
    caregiver_email: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
