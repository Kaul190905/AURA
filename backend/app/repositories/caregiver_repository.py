from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete

from app.domain.models.caregiver import CaregiverAssignment, CaregiverStatus
from app.schemas.caregiver import CaregiverUpdate

class CaregiverRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, assignment_id: UUID) -> Optional[CaregiverAssignment]:
        stmt = select(CaregiverAssignment).where(CaregiverAssignment.id == assignment_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_user_and_caregiver(self, user_id: UUID, caregiver_id: UUID) -> Optional[CaregiverAssignment]:
        stmt = select(CaregiverAssignment).where(
            CaregiverAssignment.user_id == user_id,
            CaregiverAssignment.caregiver_id == caregiver_id
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_caregivers_for_user(self, user_id: UUID) -> List[CaregiverAssignment]:
        stmt = select(CaregiverAssignment).where(CaregiverAssignment.user_id == user_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_assigned_users_for_caregiver(self, caregiver_id: UUID) -> List[CaregiverAssignment]:
        stmt = select(CaregiverAssignment).where(
            CaregiverAssignment.caregiver_id == caregiver_id,
            CaregiverAssignment.status == CaregiverStatus.ACTIVE
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_pending_invitations_for_caregiver(self, caregiver_id: UUID, caregiver_email: Optional[str] = None) -> List[CaregiverAssignment]:
        from sqlalchemy import or_
        conditions = [CaregiverAssignment.caregiver_id == caregiver_id]
        if caregiver_email:
            conditions.append(CaregiverAssignment.caregiver_email == caregiver_email)
            
        stmt = select(CaregiverAssignment).where(
            or_(*conditions),
            CaregiverAssignment.status == CaregiverStatus.PENDING
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, user_id: UUID, caregiver_id: Optional[UUID] = None, caregiver_email: Optional[str] = None) -> CaregiverAssignment:
        assignment = CaregiverAssignment(
            user_id=user_id,
            caregiver_id=caregiver_id,
            caregiver_email=caregiver_email,
            status=CaregiverStatus.PENDING,
            can_view_preferences=False,
            can_view_speech_diary=False
        )
        self.db.add(assignment)
        await self.db.commit()
        await self.db.refresh(assignment)
        return assignment

    async def update(self, assignment_id: UUID, update_data: dict) -> Optional[CaregiverAssignment]:
        stmt = (
            update(CaregiverAssignment)
            .where(CaregiverAssignment.id == assignment_id)
            .values(**update_data)
            .returning(CaregiverAssignment)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.scalars().first()

    async def delete(self, assignment_id: UUID) -> None:
        """Physically deletes the assignment (used when rejecting)."""
        stmt = delete(CaregiverAssignment).where(CaregiverAssignment.id == assignment_id)
        await self.db.execute(stmt)
        await self.db.commit()
