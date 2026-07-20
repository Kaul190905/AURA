from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

class RecommendationBase(BaseModel):
    """Base validation schema for Recommendation."""
    user_id: UUID
    title: str
    description: str

class RecommendationCreate(RecommendationBase):
    """Schema for creating a new Recommendation."""
    pass

class RecommendationUpdate(BaseModel):
    """Schema for updating an existing Recommendation."""
    title: Optional[str] = None
    description: Optional[str] = None

class RecommendationResponse(RecommendationBase):
    """Response schema for Recommendation."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
