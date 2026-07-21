from abc import ABC, abstractmethod
from typing import Dict, Any
from uuid import UUID

class IPredictionEngine(ABC):
    """
    Interface for the Prediction Engine.
    Handles forecasting future health states or events using predictive modeling.
    """

    @abstractmethod
    async def forecast_overload_event(self, user_id: UUID, current_trajectory: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict the likelihood and estimated time of a sensory or cognitive overload event.
        """
        pass

    @abstractmethod
    async def predict_metric_trend(self, user_id: UUID, metric_name: str, horizon_hours: int) -> Dict[str, Any]:
        """
        Forecast the trend of a specific metric (e.g., heart rate) over a future time horizon.
        """
        pass
