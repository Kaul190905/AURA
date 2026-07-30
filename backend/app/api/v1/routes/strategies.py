from fastapi import APIRouter, Depends
from typing import List
from uuid import UUID

from app.schemas.strategy import StrategyCreate, StrategyUpdate, StrategyResponse
from app.services.strategy_service import StrategyService
from app.api.dependencies.services import get_strategy_service

router = APIRouter()


@router.get(
    "/{user_id}",
    response_model=List[StrategyResponse],
    summary="Get all strategies for a user",
)
async def get_strategies(
    user_id: UUID,
    strategy_service: StrategyService = Depends(get_strategy_service),
):
    """Retrieve all coping strategies saved by the user."""
    return await strategy_service.get_user_strategies(user_id)


@router.post(
    "/{user_id}",
    response_model=StrategyResponse,
    status_code=201,
    summary="Create a strategy for a user",
)
async def create_strategy(
    user_id: UUID,
    strategy_in: StrategyCreate,
    strategy_service: StrategyService = Depends(get_strategy_service),
):
    """Add a new coping strategy for the user."""
    return await strategy_service.create_strategy(user_id, strategy_in)


@router.patch(
    "/{user_id}/{strategy_id}",
    response_model=StrategyResponse,
    summary="Update a strategy",
)
async def update_strategy(
    user_id: UUID,
    strategy_id: UUID,
    strategy_in: StrategyUpdate,
    strategy_service: StrategyService = Depends(get_strategy_service),
):
    """Update a specific strategy (e.g., increment helped/tried counts)."""
    return await strategy_service.update_strategy(user_id, strategy_id, strategy_in)


@router.delete(
    "/{user_id}/{strategy_id}",
    status_code=204,
    summary="Delete a strategy",
)
async def delete_strategy(
    user_id: UUID,
    strategy_id: UUID,
    strategy_service: StrategyService = Depends(get_strategy_service),
):
    """Remove a strategy."""
    await strategy_service.delete_strategy(user_id, strategy_id)
