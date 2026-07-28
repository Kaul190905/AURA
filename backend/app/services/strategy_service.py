from typing import List
from uuid import UUID
from fastapi import HTTPException, status
from app.repositories.strategy_repository import StrategyRepository
from app.schemas.strategy import StrategyCreate, StrategyUpdate
from app.domain.models.strategy import Strategy

class StrategyService:
    def __init__(self, repository: StrategyRepository):
        self.repository = repository

    async def get_user_strategies(self, user_id: UUID) -> List[Strategy]:
        return await self.repository.get_by_user(user_id)

    async def create_strategy(self, user_id: UUID, strategy_in: StrategyCreate) -> Strategy:
        return await self.repository.create(user_id, strategy_in)

    async def update_strategy(self, user_id: UUID, strategy_id: UUID, strategy_in: StrategyUpdate) -> Strategy:
        strategy = await self.repository.get(strategy_id)
        if not strategy or strategy.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
        return await self.repository.update(strategy, strategy_in)

    async def delete_strategy(self, user_id: UUID, strategy_id: UUID) -> None:
        strategy = await self.repository.get(strategy_id)
        if not strategy or strategy.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
        await self.repository.delete(strategy)
