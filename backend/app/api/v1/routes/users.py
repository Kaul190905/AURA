from fastapi import APIRouter, Depends, status
from uuid import UUID

from app.core.security import get_current_user
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.user_preference import UserPreferenceUpdate, UserPreferenceResponse
from app.services.user_service import UserService
from app.api.dependencies.services import get_user_service

router = APIRouter()

@router.get("/me", response_model=dict, summary="Get Current User Profile")
async def get_my_profile(current_user = Depends(get_current_user)):
    """
    Get the currently authenticated user's profile directly from Supabase token.
    This route acts as a gateway validation for the frontend.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "metadata": current_user.user_metadata,
        "last_sign_in": current_user.last_sign_in_at
    }

@router.get("/profile", response_model=UserResponse, summary="Get Complete Profile")
async def get_profile(
    current_user = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """
    Retrieve the authenticated user's complete profile, including preferences.
    """
    return await user_service.get_user_by_id(current_user.id)

@router.put("/profile", response_model=UserResponse, summary="Update Core Profile")
async def update_profile(
    user_update: UserUpdate,
    current_user = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """
    Update the authenticated user's core details (e.g. email).
    """
    return await user_service.update_user(current_user.id, user_update)

@router.put("/preferences", response_model=UserPreferenceResponse, summary="Update IoT Preferences")
async def update_preferences(
    prefs_update: UserPreferenceUpdate,
    current_user = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """
    Update the authenticated user's specific IoT health and AI preferences.
    """
    return await user_service.update_user_preferences(current_user.id, prefs_update)

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create a new User")
async def create_user(
    user_in: UserCreate, 
    user_service: UserService = Depends(get_user_service)
):
    """
    Create a new user in the AURA database.
    """
    return await user_service.create_user(user_in)

@router.get("/{user_id}", response_model=UserResponse, summary="Get a User by ID")
async def get_user(
    user_id: UUID, 
    user_service: UserService = Depends(get_user_service)
):
    """
    Retrieve a user by their UUID.
    """
    return await user_service.get_user_by_id(user_id)

@router.put("/{user_id}", response_model=UserResponse, summary="Update a User")
async def update_user(
    user_id: UUID, 
    user_update: UserUpdate, 
    user_service: UserService = Depends(get_user_service)
):
    """
    Update a user's details.
    """
    return await user_service.update_user(user_id, user_update)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a User")
async def delete_user(
    user_id: UUID, 
    user_service: UserService = Depends(get_user_service)
):
    """
    Delete a user from the AURA database.
    """
    await user_service.delete_user(user_id)
    return None
