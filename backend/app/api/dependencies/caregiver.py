from fastapi import Depends, HTTPException, status
from uuid import UUID

from app.core.security import get_current_user
from app.api.dependencies.services import get_caregiver_repository
from app.repositories.caregiver_repository import CaregiverRepository
from app.domain.models.caregiver import CaregiverStatus

async def require_active_caregiver_access(
    target_user_id: UUID,
    current_user = Depends(get_current_user),
    caregiver_repo: CaregiverRepository = Depends(get_caregiver_repository)
):
    """
    Dependency to ensure the current user is an active caregiver for the target user.
    """
    assignment = await caregiver_repo.get_by_user_and_caregiver(target_user_id, current_user.id)
    
    if not assignment or assignment.status != CaregiverStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not an active caregiver for this user."
        )
    return assignment

def require_caregiver_permission(permission: str):
    """
    Factory dependency to ensure the current user is an active caregiver 
    AND has the specified boolean permission (e.g., 'can_view_preferences').
    """
    async def _require_permission(
        target_user_id: UUID,
        current_user = Depends(get_current_user),
        caregiver_repo: CaregiverRepository = Depends(get_caregiver_repository)
    ):
        assignment = await caregiver_repo.get_by_user_and_caregiver(target_user_id, current_user.id)
        
        if not assignment or assignment.status != CaregiverStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not an active caregiver for this user."
            )
            
        if not getattr(assignment, permission, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have the {permission} permission for this user."
            )
        
        return assignment
        
    return _require_permission
