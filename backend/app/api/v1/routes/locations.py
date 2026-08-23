from fastapi import APIRouter, Depends
from typing import List, Dict
from uuid import UUID

from app.core.security import get_current_user
from app.db.database import get_db

router = APIRouter()

@router.get("/high-risk")
async def get_high_risk_locations(
    user_id: UUID,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    # Mock data for high-risk locations until spatial queries are fully supported
    return [
        {"id": "1", "name": "Downtown Transit Center", "riskScore": 8, "visits": 12, "reason": "High sustained noise levels"},
        {"id": "2", "name": "University Cafeteria", "riskScore": 7, "visits": 45, "reason": "Crowded, unpredictable noise"},
        {"id": "3", "name": "Shopping Mall", "riskScore": 6, "visits": 8, "reason": "Bright lights, echoing"}
    ]
