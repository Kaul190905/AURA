from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models.accommodation import Accommodation
from app.schemas.accommodation import AccommodationCreate, AccommodationUpdate

class AccommodationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user(self, user_id: UUID) -> List[Accommodation]:
        stmt = select(Accommodation).where(Accommodation.user_id == user_id).order_by(Accommodation.time.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, user_id: UUID, accommodation_in: AccommodationCreate) -> Accommodation:
        accommodation = Accommodation(
            user_id=user_id,
            text=accommodation_in.text,
            time=accommodation_in.time
        )
        self.session.add(accommodation)
        await self.session.commit()
        await self.session.refresh(accommodation)
        return accommodation

    async def get(self, accommodation_id: UUID) -> Optional[Accommodation]:
        return await self.session.get(Accommodation, accommodation_id)

    async def update(self, accommodation: Accommodation, update_data: AccommodationUpdate) -> Accommodation:
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(accommodation, field, value)
        await self.session.commit()
        await self.session.refresh(accommodation)
        return accommodation

    async def delete(self, accommodation: Accommodation) -> None:
        await self.session.delete(accommodation)
        await self.session.commit()
