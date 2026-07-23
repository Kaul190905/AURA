from fastapi import APIRouter, Depends, Query
from uuid import UUID

from app.ai.risk_engine import IRiskEngine
from app.api.dependencies.services import get_risk_engine

router = APIRouter()


@router.get("/trend", response_model=dict, summary="Analyze Historical Risk Trend")
async def get_risk_trend(
    user_id: UUID = Query(..., description="User ID to analyze"),
    days: int = Query(7, ge=1, le=90, description="Historical window in days"),
    risk_engine: IRiskEngine = Depends(get_risk_engine),
):
    """
    Analyze a user's risk trend over a historical window.

    Only produces a real trend when the ML risk engine is active
    (`USE_ML_RISK_ENGINE=true` and a trained model artifact exists) — the
    rule-based engine returns `{"status": "not_implemented"}` for this
    method, since historical trend analysis isn't part of its design.
    """
    return await risk_engine.analyze_historical_risk(user_id, days)
