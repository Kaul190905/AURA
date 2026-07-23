from typing import Any, Dict
from uuid import UUID

from app.ai.pattern_engine import IPatternEngine
from app.repositories.sensor_data_repository import SensorDataRepository


class PatternService:
    """Service layer for AI-driven anomaly detection and behavioral pattern analysis."""

    def __init__(self, sensor_data_repo: SensorDataRepository, pattern_engine: IPatternEngine):
        self.sensor_data_repo = sensor_data_repo
        self.pattern_engine = pattern_engine

    async def get_anomalies(self, user_id: UUID, limit: int = 50) -> Dict[str, Any]:
        """Run anomaly detection over a user's most recent sensor data window."""
        records = await self.sensor_data_repo.get_history(
            user_id=user_id, skip=0, limit=limit, sort_by="desc"
        )
        telemetry_data = [self._to_telemetry_dict(r) for r in records]

        anomalies = await self.pattern_engine.detect_anomalies(user_id, telemetry_data)
        anomaly_count = sum(1 for a in anomalies if a["is_anomaly"])

        return {
            "user_id": user_id,
            "analyzed_count": len(telemetry_data),
            "anomaly_count": anomaly_count,
            "anomalies": anomalies,
        }

    async def get_behavioral_patterns(self, user_id: UUID) -> Dict[str, Any]:
        """Extract recurring behavioral states from a user's sensor history."""
        return await self.pattern_engine.extract_behavioral_patterns(user_id)

    @staticmethod
    def _to_telemetry_dict(record) -> Dict[str, Any]:
        return {
            "id": str(record.id),
            "timestamp": record.timestamp.isoformat() if record.timestamp else None,
            "heart_rate": record.heart_rate,
            "blood_oxygen": record.blood_oxygen,
            "temperature": record.temperature,
            "noise": record.noise,
        }
