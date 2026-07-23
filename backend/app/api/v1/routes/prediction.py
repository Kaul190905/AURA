from fastapi import APIRouter, Depends, Query
from uuid import UUID

from app.schemas.prediction import OverloadForecastResponse, MetricTrendResponse
from app.services.prediction_service import PredictionService
from app.api.dependencies.services import get_prediction_service

router = APIRouter()


@router.get("/overload-forecast", response_model=OverloadForecastResponse, summary="Forecast an Overload Event")
async def get_overload_forecast(
    user_id: UUID = Query(..., description="User ID to analyze"),
    window: int = Query(10, ge=2, le=50, description="Number of recent readings to build the trajectory from"),
    prediction_service: PredictionService = Depends(get_prediction_service),
):
    """
    Estimate the probability (and, if trending toward it, ETA) of an
    overload event based on the user's recent risk-score trajectory. Uses
    the ML model when USE_ML_PREDICTION_ENGINE is enabled and a trained
    artifact exists, otherwise a deterministic slope-based heuristic.
    """
    return await prediction_service.get_overload_forecast(user_id, window=window)


@router.get("/trend", response_model=MetricTrendResponse, summary="Forecast a Metric Trend")
async def get_metric_trend(
    user_id: UUID = Query(..., description="User ID to analyze"),
    metric_name: str = Query(..., description="Sensor metric to forecast, e.g. heart_rate, noise, temperature"),
    horizon_hours: int = Query(6, ge=1, le=72, description="How many hours ahead to project"),
    prediction_service: PredictionService = Depends(get_prediction_service),
):
    """
    Linearly extrapolate a specific sensor metric forward by `horizon_hours`
    based on the user's recent history.
    """
    return await prediction_service.get_metric_trend(user_id, metric_name, horizon_hours)
