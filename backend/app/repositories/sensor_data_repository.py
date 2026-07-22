import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict
from sqlalchemy import select, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models.sensor_data import SensorData
from app.schemas.sensor_data import SensorDataCreate, SensorDataUpdate

class SensorDataRepository:
    """Repository for managing SensorData persistence operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def create(self, user_id: uuid.UUID, data_in: SensorDataCreate) -> SensorData:
        """Create a new sensor data record."""
        # Convert schema to model dictionary
        data_dict = data_in.model_dump()
        data_dict["user_id"] = user_id
        
        new_data = SensorData(**data_dict)
        self.db.add(new_data)
        await self.db.commit()
        await self.db.refresh(new_data)
        return new_data

    async def get_history(
        self,
        user_id: Optional[uuid.UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "desc"
    ) -> List[SensorData]:
        """
        Get sensor data history with filtering, pagination, and sorting.
        """
        query = select(SensorData)
        
        # Filtering
        if user_id:
            query = query.where(SensorData.user_id == user_id)
        if start_date:
            query = query.where(SensorData.timestamp >= start_date)
        if end_date:
            query = query.where(SensorData.timestamp <= end_date)
            
        # Sorting
        if sort_by.lower() == "asc":
            query = query.order_by(asc(SensorData.timestamp))
        else:
            query = query.order_by(desc(SensorData.timestamp))
            
        # Pagination
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
