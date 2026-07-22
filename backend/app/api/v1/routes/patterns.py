from fastapi import APIRouter, Depends, Query
from uuid import UUID

from app.schemas.pattern import AnomalyDetectionResponse, BehavioralPatternResponse
from app.services.pattern_service import PatternService
from app.api.dependencies.services import get_pattern_service

router = APIRouter()


@router.get("/anomalies", response_model=AnomalyDetectionResponse, summary="Detect Sensor Data Anomalies")
async def get_anomalies(
    user_id: UUID = Query(..., description="User ID to analyze"),
    limit: int = Query(50, ge=5, le=500, description="Number of recent readings to analyze"),
    pattern_service: PatternService = Depends(get_pattern_service),
):
    """
    Run anomaly detection over a user's recent sensor data window.

    Uses an IsolationForest when enough data is available (>= 20 readings by
    default), otherwise falls back to a per-feature z-score check.
    """
    return await pattern_service.get_anomalies(user_id, limit=limit)


@router.get("/behavioral", response_model=BehavioralPatternResponse, summary="Extract Behavioral Patterns")
async def get_behavioral_patterns(
    user_id: UUID = Query(..., description="User ID to analyze"),
    pattern_service: PatternService = Depends(get_pattern_service),
):
    """
    Cluster a user's recent sensor history into recurring behavioral states
    (e.g. rest periods, elevated-activity windows, high-noise environments).
    """
    return await pattern_service.get_behavioral_patterns(user_id)
