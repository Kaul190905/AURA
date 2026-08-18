from fastapi import APIRouter
from app.api.v1.routes.users import router as users_router
from app.api.v1.routes.sensor_data import router as sensor_data_router
from app.api.v1.routes.alerts import router as alerts_router
from app.api.v1.routes.patterns import router as patterns_router
from app.api.v1.routes.risk import router as risk_router
from app.api.v1.routes.wellness import router as wellness_router
from app.api.v1.routes.recommendations import router as recommendations_router
from app.api.v1.routes.prediction import router as prediction_router
from app.api.v1.routes.overload_events import router as overload_events_router
from app.api.v1.routes.strategies import router as strategies_router
from app.api.v1.routes.accommodations import router as accommodations_router
from app.api.v1.routes.caregivers import router as caregivers_router
from app.api.v1.routes.locations import router as locations_router

api_router = APIRouter()

# Include feature-specific routers
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(sensor_data_router, prefix="/sensor-data", tags=["Sensor Data"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(patterns_router, prefix="/patterns", tags=["Patterns"])
api_router.include_router(risk_router, prefix="/risk", tags=["Risk"])
api_router.include_router(wellness_router, prefix="/wellness", tags=["Wellness"])
api_router.include_router(recommendations_router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(prediction_router, prefix="/prediction", tags=["Prediction"])
api_router.include_router(overload_events_router, prefix="/overload-events", tags=["Overload Events"])
api_router.include_router(strategies_router, prefix="/strategies", tags=["Strategies"])
api_router.include_router(accommodations_router, prefix="/accommodations", tags=["Accommodations"])
api_router.include_router(caregivers_router, prefix="/caregivers", tags=["Caregivers"])
api_router.include_router(locations_router, prefix="/locations", tags=["Locations"])
