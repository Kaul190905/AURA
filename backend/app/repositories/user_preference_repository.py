from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
import logging

from app.domain.models.user_preference import UserPreference
from app.schemas.user_preference import UserPreferenceUpdate

logger = logging.getLogger(__name__)

class UserPreferenceRepository:
    """
    Repository for UserPreference database operations.
    """
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_id(self, user_id: UUID) -> Optional[UserPreference]:
        """Fetch preferences by user_id."""
        stmt = select(UserPreference).where(UserPreference.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def upsert(self, user_id: UUID, prefs_update: UserPreferenceUpdate) -> UserPreference:
        """Update or create preferences for a user."""
        prefs = await self.get_by_user_id(user_id)
        
        if not prefs:
            prefs = UserPreference(user_id=user_id)
            self.db.add(prefs)
            
        update_data = prefs_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(prefs, field, value)
            
        try:
            await self.db.commit()
            await self.db.refresh(prefs)
            return prefs
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error(f"Error upserting preferences for user {user_id}: {e}")
            raise
