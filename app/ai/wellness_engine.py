from abc import ABC, abstractmethod
from typing import Dict, Any
from uuid import UUID

class IWellnessEngine(ABC):
    """
    Interface for the Wellness Engine.
    Focuses on calculating overall holistic wellness metrics.
    """

    @abstractmethod
    async def calculate_wellness_score(self, user_id: UUID, data_snapshot: Dict[str, Any]) -> int:
        """
        Calculate an aggregate wellness score (e.g., 0-100) based on recent health markers.
        """
        pass

    @abstractmethod
    async def get_wellness_breakdown(self, user_id: UUID) -> Dict[str, float]:
        """
        Provide a breakdown of the wellness score into categories (e.g., physical, mental recovery).
        """
        pass
