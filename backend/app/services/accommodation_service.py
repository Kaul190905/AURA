from typing import List
from uuid import UUID
from fastapi import HTTPException, status
from app.repositories.accommodation_repository import AccommodationRepository
from app.schemas.accommodation import AccommodationCreate, AccommodationUpdate
from app.domain.models.accommodation import Accommodation

class AccommodationService:
    def __init__(self, repository: AccommodationRepository):
        self.repository = repository

    async def get_user_accommodations(self, user_id: UUID) -> List[Accommodation]:
        return await self.repository.get_by_user(user_id)

    async def create_accommodation(self, user_id: UUID, accommodation_in: AccommodationCreate) -> Accommodation:
        return await self.repository.create(user_id, accommodation_in)

    async def update_accommodation(self, user_id: UUID, accommodation_id: UUID, accommodation_in: AccommodationUpdate) -> Accommodation:
        accommodation = await self.repository.get(accommodation_id)
        if not accommodation or accommodation.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Accommodation not found")
        return await self.repository.update(accommodation, accommodation_in)

    async def delete_accommodation(self, user_id: UUID, accommodation_id: UUID) -> None:
        accommodation = await self.repository.get(accommodation_id)
        if not accommodation or accommodation.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Accommodation not found")
        await self.repository.delete(accommodation)
