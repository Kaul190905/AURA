from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.schemas.user_preference import UserPreferenceResponse

class UserBase(BaseModel):
    """Base validation schema for User."""
    email: EmailStr
    is_active: bool = True

class UserCreate(UserBase):
    """Schema for creating a new User."""
    pass

class UserUpdate(BaseModel):
    """Schema for updating an existing User."""
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    """Response schema for User."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    preferences: Optional[UserPreferenceResponse] = None

    model_config = ConfigDict(from_attributes=True)
