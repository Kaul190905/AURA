from fastapi import APIRouter
from app.api.v1.routes.users import router as users_router

api_router = APIRouter()

# Include feature-specific routers
api_router.include_router(users_router, prefix="/users", tags=["Users"])
