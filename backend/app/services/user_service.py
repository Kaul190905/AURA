from uuid import UUID
from fastapi import status

from app.schemas.user import UserCreate, UserUpdate
from app.schemas.user_preference import UserPreferenceUpdate
from app.repositories.user_repository import UserRepository
from app.repositories.user_preference_repository import UserPreferenceRepository
from app.domain.models.user import User
from app.domain.models.user_preference import UserPreference
from app.core.exceptions import NotFoundException, AURAException

class UserService:
    """
    Service layer for User business logic.
    Coordinates between the API layer and the Repository layer.
    Contains strictly business logic, delegating database access to UserRepository.
    """
    def __init__(self, user_repo: UserRepository, prefs_repo: UserPreferenceRepository):
        self.user_repo = user_repo
        self.prefs_repo = prefs_repo

    async def create_user(self, user_in: UserCreate) -> User:
        """
        Creates a new user. 
        Business Rule: Ensures the email address is unique across the platform.
        """
        existing_user = await self.user_repo.get_user_by_email(user_in.email)
        if existing_user:
            raise AURAException(
                message=f"User with email {user_in.email} already exists",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        return await self.user_repo.create_user(user_in)

    async def get_user_by_id(self, user_id: UUID) -> User:
        """
        Retrieves a user by ID. 
        Business Rule: Throws a clean 404 Exception if the user is missing.
        """
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise NotFoundException(message=f"User with id {user_id} not found")
        return user

    async def get_user_by_email(self, email: str) -> User:
        """
        Retrieves a user by email.
        Business Rule: Throws a clean 404 Exception if the user is missing.
        """
        user = await self.user_repo.get_user_by_email(email)
        if not user:
            raise NotFoundException(message=f"User with email {email} not found")
        return user

    async def update_user(self, user_id: UUID, user_update: UserUpdate) -> User:
        """
        Updates a user. 
        Business Rule: Ensures new email uniqueness if the email is being changed.
        """
        # Verify the user actually exists first
        existing_user = await self.get_user_by_id(user_id)
        
        # If they are changing their email, make sure someone else isn't using it
        if user_update.email and user_update.email != existing_user.email:
            email_conflict = await self.user_repo.get_user_by_email(user_update.email)
            if email_conflict:
                raise AURAException(
                    message=f"Email {user_update.email} is already in use by another account",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
                
        return await self.user_repo.update_user(user_id, user_update)

    async def delete_user(self, user_id: UUID) -> bool:
        """
        Deletes a user by ID.
        """
        return await self.user_repo.delete_user(user_id)

    async def update_user_preferences(self, user_id: UUID, prefs_update: UserPreferenceUpdate) -> UserPreference:
        """
        Updates the user's IoT preferences, ensuring the user exists first.
        """
        # Ensure user exists before trying to link preferences
        await self.get_user_by_id(user_id)
        
        return await self.prefs_repo.upsert(user_id, prefs_update)
