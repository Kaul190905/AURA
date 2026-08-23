from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID

class AccommodationBase(BaseModel):
    text: str = Field(..., json_schema_extra={"example": "Allowed headphones during math class"})
    time: Optional[datetime] = None

class AccommodationCreate(AccommodationBase):
    pass

class AccommodationUpdate(BaseModel):
    text: Optional[str] = None
    time: Optional[datetime] = None

class AccommodationResponse(AccommodationBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
