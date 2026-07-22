from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
import logging

from app.domain.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.exceptions import NotFoundException

logger = logging.getLogger(__name__)

class UserRepository:
    """
    Repository layer for managing User database operations.
    Keeps database interaction isolated from business logic.
    """
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_user(self, user_in: UserCreate) -> User:
        """Create a new user in the database."""
        try:
            db_user = User(**user_in.model_dump())
            self.db.add(db_user)
            await self.db.commit()
            return await self.get_user_by_id(db_user.id)
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error(f"Database error while creating user: {e}")
            raise

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Fetch a user by their UUID."""
        stmt = select(User).options(selectinload(User.preferences)).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Fetch a user by their email address."""
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def update_user(self, user_id: UUID, user_update: UserUpdate) -> User:
        """Update an existing user's fields."""
        db_user = await self.get_user_by_id(user_id)
        if not db_user:
            raise NotFoundException(message=f"User with id {user_id} not found")
        
        # Only update fields that were actually provided in the request
        update_data = user_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_user, field, value)
            
        try:
            await self.db.commit()
            await self.db.refresh(db_user)
            return db_user
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error(f"Database error while updating user {user_id}: {e}")
            raise

    async def delete_user(self, user_id: UUID) -> bool:
        """Delete a user from the database."""
        db_user = await self.get_user_by_id(user_id)
        if not db_user:
            raise NotFoundException(message=f"User with id {user_id} not found")
            
        try:
            await self.db.delete(db_user)
            await self.db.commit()
            return True
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error(f"Database error while deleting user {user_id}: {e}")
            raise
