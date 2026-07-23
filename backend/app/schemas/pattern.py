from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from uuid import UUID


class AnomalyRecord(BaseModel):
    """A single telemetry point scored for anomalousness."""
    index: int
    record: Dict[str, Any]
    is_anomaly: bool
    anomaly_score: float
    method: str


class AnomalyDetectionResponse(BaseModel):
    user_id: UUID
    analyzed_count: int
    anomaly_count: int
    anomalies: List[AnomalyRecord]


class BehavioralCluster(BaseModel):
    cluster_id: int
    size: int
    share: float
    avg_metrics: Dict[str, float]
    label: str


class BehavioralPatternResponse(BaseModel):
    status: str
    samples_analyzed: Optional[int] = None
    samples_collected: Optional[int] = None
    samples_required: Optional[int] = None
    clusters: Optional[List[BehavioralCluster]] = None
    dominant_pattern: Optional[str] = None
