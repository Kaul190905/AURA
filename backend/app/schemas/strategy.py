from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID

class StrategyBase(BaseModel):
    title: str = Field(..., json_schema_extra={"example": "Put on noise-cancelling headphones"})
    trigger: str = Field(..., json_schema_extra={"example": "sound"})
    helped: int = Field(default=0)
    tried: int = Field(default=0)

class StrategyCreate(StrategyBase):
    pass

class StrategyUpdate(BaseModel):
    title: Optional[str] = None
    trigger: Optional[str] = None
    helped: Optional[int] = None
    tried: Optional[int] = None

class StrategyResponse(StrategyBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
