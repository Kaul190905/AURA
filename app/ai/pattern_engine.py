from abc import ABC, abstractmethod
from typing import List, Dict, Any
from uuid import UUID

class IPatternEngine(ABC):
    """
    Interface for the Pattern Engine.
    Dedicated to discovering anomalies, habits, or recurring trends in sensor data.
    """

    @abstractmethod
    async def detect_anomalies(self, user_id: UUID, telemetry_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Identify anomalous data points within a time series of telemetry data.
        """
        pass

    @abstractmethod
    async def extract_behavioral_patterns(self, user_id: UUID) -> Dict[str, Any]:
        """
        Extract long-term behavioral patterns (e.g., sleep cycles, activity peaks).
        """
        pass
