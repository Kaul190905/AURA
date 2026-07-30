from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models.strategy import Strategy
from app.schemas.strategy import StrategyCreate, StrategyUpdate

class StrategyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user(self, user_id: UUID) -> List[Strategy]:
        stmt = select(Strategy).where(Strategy.user_id == user_id).order_by(Strategy.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, user_id: UUID, strategy_in: StrategyCreate) -> Strategy:
        strategy = Strategy(
            user_id=user_id,
            title=strategy_in.title,
            trigger=strategy_in.trigger,
            helped=strategy_in.helped,
            tried=strategy_in.tried
        )
        self.session.add(strategy)
        await self.session.commit()
        await self.session.refresh(strategy)
        return strategy

    async def get(self, strategy_id: UUID) -> Optional[Strategy]:
        return await self.session.get(Strategy, strategy_id)

    async def update(self, strategy: Strategy, update_data: StrategyUpdate) -> Strategy:
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(strategy, field, value)
        await self.session.commit()
        await self.session.refresh(strategy)
        return strategy

    async def delete(self, strategy: Strategy) -> None:
        await self.session.delete(strategy)
        await self.session.commit()
