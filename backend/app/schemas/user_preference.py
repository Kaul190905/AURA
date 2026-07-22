from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class UserPreferenceBase(BaseModel):
    preferred_noise: Optional[float] = None
    preferred_temperature: Optional[float] = None
    preferred_places: Optional[List[str]] = None
    trigger_foods: Optional[List[str]] = None
    notification_settings: Optional[Dict[str, Any]] = None
    ai_settings: Optional[Dict[str, Any]] = None

class UserPreferenceCreate(UserPreferenceBase):
    user_id: UUID

class UserPreferenceUpdate(UserPreferenceBase):
    pass

class UserPreferenceResponse(UserPreferenceBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
