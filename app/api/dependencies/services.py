from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.db import get_db
from app.repositories.user_repository import UserRepository
from app.repositories.user_preference_repository import UserPreferenceRepository
from app.services.user_service import UserService
from app.repositories.sensor_data_repository import SensorDataRepository
from app.services.sensor_data_service import SensorDataService

def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    """Dependency to provide a UserRepository instance."""
    return UserRepository(db)

def get_user_preference_repository(db: AsyncSession = Depends(get_db)) -> UserPreferenceRepository:
    """Dependency to provide a UserPreferenceRepository instance."""
    return UserPreferenceRepository(db)

def get_user_service(
    user_repo: UserRepository = Depends(get_user_repository),
    prefs_repo: UserPreferenceRepository = Depends(get_user_preference_repository)
) -> UserService:
    """Dependency to provide a UserService instance."""
    return UserService(user_repo, prefs_repo)

def get_sensor_data_repository(db: AsyncSession = Depends(get_db)) -> SensorDataRepository:
    """Dependency to provide a SensorDataRepository instance."""
    return SensorDataRepository(db)

def get_sensor_data_service(
    sensor_repo: SensorDataRepository = Depends(get_sensor_data_repository)
) -> SensorDataService:
    """Dependency to provide a SensorDataService instance."""
    return SensorDataService(sensor_repo)
