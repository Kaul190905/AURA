import uuid
from datetime import datetime
from typing import Optional, List
from app.schemas.sensor_data import SensorDataCreate, SensorDataResponse
from app.repositories.sensor_data_repository import SensorDataRepository

class SensorDataService:
    """Service layer for sensor data operations."""
    
    def __init__(self, sensor_data_repo: SensorDataRepository):
        self.sensor_data_repo = sensor_data_repo

    async def create_sensor_data(self, user_id: uuid.UUID, data_in: SensorDataCreate) -> SensorDataResponse:
        """
        Validate and create new sensor data.
        """
        created_data = await self.sensor_data_repo.create(user_id, data_in)
        return created_data

    async def get_history(
        self,
        user_id: Optional[uuid.UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "desc"
    ) -> List[SensorDataResponse]:
        """
        Get paginated, filtered, and sorted sensor data history.
        """
        history = await self.sensor_data_repo.get_history(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            skip=skip,
            limit=limit,
            sort_by=sort_by
        )
        return history
