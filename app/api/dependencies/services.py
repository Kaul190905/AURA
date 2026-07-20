from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.db import get_db
from app.repositories.user_repository import UserRepository
from app.repositories.user_preference_repository import UserPreferenceRepository
from app.services.user_service import UserService

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
