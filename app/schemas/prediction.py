from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class OverloadForecastResponse(BaseModel):
    user_id: UUID
    overload_probability: float
    estimated_minutes_to_event: Optional[float] = None
    trend: str
    method: str
    samples_used: int


class MetricTrendResponse(BaseModel):
    status: str
    metric_name: str
    horizon_hours: Optional[int] = None
    current_value: Optional[float] = None
    predicted_value: Optional[float] = None
    trend: Optional[str] = None
    samples_analyzed: Optional[int] = None
    samples_collected: Optional[int] = None
    method: Optional[str] = None
