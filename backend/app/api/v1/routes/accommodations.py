from fastapi import APIRouter, Depends
from typing import List
from uuid import UUID

from app.schemas.accommodation import AccommodationCreate, AccommodationUpdate, AccommodationResponse
from app.services.accommodation_service import AccommodationService
from app.api.dependencies.services import get_accommodation_service

router = APIRouter()


@router.get(
    "/{user_id}",
    response_model=List[AccommodationResponse],
    summary="Get all accommodations for a user",
)
async def get_accommodations(
    user_id: UUID,
    accommodation_service: AccommodationService = Depends(get_accommodation_service),
):
    """Retrieve all accommodations/access needs saved by the user."""
    return await accommodation_service.get_user_accommodations(user_id)


@router.post(
    "/{user_id}",
    response_model=AccommodationResponse,
    status_code=201,
    summary="Create an accommodation for a user",
)
async def create_accommodation(
    user_id: UUID,
    accommodation_in: AccommodationCreate,
    accommodation_service: AccommodationService = Depends(get_accommodation_service),
):
    """Add a new accommodation/access need for the user."""
    return await accommodation_service.create_accommodation(user_id, accommodation_in)


@router.patch(
    "/{user_id}/{accommodation_id}",
    response_model=AccommodationResponse,
    summary="Update an accommodation",
)
async def update_accommodation(
    user_id: UUID,
    accommodation_id: UUID,
    accommodation_in: AccommodationUpdate,
    accommodation_service: AccommodationService = Depends(get_accommodation_service),
):
    """Update a specific accommodation."""
    return await accommodation_service.update_accommodation(user_id, accommodation_id, accommodation_in)


@router.delete(
    "/{user_id}/{accommodation_id}",
    status_code=204,
    summary="Delete an accommodation",
)
async def delete_accommodation(
    user_id: UUID,
    accommodation_id: UUID,
    accommodation_service: AccommodationService = Depends(get_accommodation_service),
):
    """Remove an accommodation."""
    await accommodation_service.delete_accommodation(user_id, accommodation_id)
