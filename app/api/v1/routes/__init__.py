from fastapi import APIRouter
from app.api.v1.routes.users import router as users_router
from app.api.v1.routes.sensor_data import router as sensor_data_router
from app.api.v1.routes.alerts import router as alerts_router
from app.api.v1.routes.patterns import router as patterns_router
from app.api.v1.routes.risk import router as risk_router
from app.api.v1.routes.wellness import router as wellness_router
from app.api.v1.routes.recommendations import router as recommendations_router

api_router = APIRouter()

# Include feature-specific routers
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(sensor_data_router, prefix="/sensor-data", tags=["Sensor Data"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(patterns_router, prefix="/patterns", tags=["Patterns"])
api_router.include_router(risk_router, prefix="/risk", tags=["Risk"])
api_router.include_router(wellness_router, prefix="/wellness", tags=["Wellness"])
api_router.include_router(recommendations_router, prefix="/recommendations", tags=["Recommendations"])
