from fastapi import APIRouter
from app.api.v1.routes.users import router as users_router
from app.api.v1.routes.sensor_data import router as sensor_data_router
from app.api.v1.routes.alerts import router as alerts_router

api_router = APIRouter()

# Include feature-specific routers
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(sensor_data_router, prefix="/sensor-data", tags=["Sensor Data"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
