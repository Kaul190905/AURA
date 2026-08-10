from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException, status
import logging

from app.repositories.caregiver_repository import CaregiverRepository
from app.repositories.user_repository import UserRepository
from app.schemas.caregiver import CaregiverUpdate
from app.domain.models.caregiver import CaregiverAssignment, CaregiverStatus

logger = logging.getLogger(__name__)

class CaregiverService:
    def __init__(self, caregiver_repo: CaregiverRepository, user_repo: UserRepository):
        self.caregiver_repo = caregiver_repo
        self.user_repo = user_repo

    async def invite_caregiver(self, owner_user_id: UUID, caregiver_email: str) -> CaregiverAssignment:
        # Resolve email to user_id
        caregiver_user = await self.user_repo.get_by_email(caregiver_email)
        if not caregiver_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caregiver account not found.")

        caregiver_id = caregiver_user.id
        
        if str(owner_user_id) == str(caregiver_id):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cannot invite yourself as caregiver.")

        existing = await self.caregiver_repo.get_by_user_and_caregiver(owner_user_id, caregiver_id)
        if existing:
            if existing.status in [CaregiverStatus.PENDING, CaregiverStatus.ACTIVE]:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Assignment already exists and is active or pending.")
            # If revoked, we can reinstate by changing status to pending and resetting permissions
            update_data = {
                "status": CaregiverStatus.PENDING,
                "can_view_preferences": False,
                "can_view_speech_diary": False
            }
            return await self.caregiver_repo.update(existing.id, update_data)

        return await self.caregiver_repo.create(owner_user_id, caregiver_id)

    async def get_user_caregivers(self, user_id: UUID) -> List[CaregiverAssignment]:
        return await self.caregiver_repo.get_caregivers_for_user(user_id)

    async def update_permissions(self, user_id: UUID, assignment_id: UUID, update_data: CaregiverUpdate) -> CaregiverAssignment:
        assignment = await self.caregiver_repo.get_by_id(assignment_id)
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
        if str(assignment.user_id) != str(user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this assignment.")
        
        update_dict = update_data.model_dump(exclude_unset=True)
        if not update_dict:
            return assignment

        return await self.caregiver_repo.update(assignment_id, update_dict)

    async def revoke_caregiver(self, user_id: UUID, assignment_id: UUID) -> CaregiverAssignment:
        assignment = await self.caregiver_repo.get_by_id(assignment_id)
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
        if str(assignment.user_id) != str(user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to revoke this assignment.")

        return await self.caregiver_repo.update(assignment_id, {"status": CaregiverStatus.REVOKED})

    async def accept_invitation(self, caregiver_id: UUID, assignment_id: UUID) -> CaregiverAssignment:
        assignment = await self.caregiver_repo.get_by_id(assignment_id)
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
        if str(assignment.caregiver_id) != str(caregiver_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to accept this assignment.")
        if assignment.status != CaregiverStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Assignment is not pending.")

        return await self.caregiver_repo.update(assignment_id, {"status": CaregiverStatus.ACTIVE})

    async def reject_invitation(self, caregiver_id: UUID, assignment_id: UUID) -> None:
        assignment = await self.caregiver_repo.get_by_id(assignment_id)
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
        if str(assignment.caregiver_id) != str(caregiver_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to reject this assignment.")
        if assignment.status != CaregiverStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only pending assignments can be rejected.")

        await self.caregiver_repo.delete(assignment_id)

    async def get_assigned_users(self, caregiver_id: UUID) -> List[CaregiverAssignment]:
        return await self.caregiver_repo.get_assigned_users_for_caregiver(caregiver_id)

    async def get_pending_invitations(self, caregiver_id: UUID) -> List[CaregiverAssignment]:
        return await self.caregiver_repo.get_pending_invitations_for_caregiver(caregiver_id)
