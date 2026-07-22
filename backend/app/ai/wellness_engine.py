from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
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


class RuleWellnessEngine(IWellnessEngine):
    """
    Concrete, deterministic implementation of the Wellness Engine.

    Combines three signals into a weighted composite:
      - physical:  inverse of current risk score (RiskEngine)
      - mental:    recent self-reported wellness (WellnessCheckin), defaulting
                   to a neutral 70 when the user hasn't checked in
      - stability: inverse of recent anomaly rate (PatternEngine)

    This is the safe fallback used whenever the ML-backed WellnessEngine's
    model artifact is unavailable, and the only implementation self-report
    data isn't required for.
    """

    def __init__(
        self,
        sensor_data_repo=None,
        wellness_checkin_repo=None,
        prefs_repo=None,
        risk_engine=None,
        pattern_engine=None,
        physical_weight: float = 0.4,
        mental_weight: float = 0.4,
        stability_weight: float = 0.2,
        neutral_mood_default: float = 70.0,
        anomaly_window: int = 50,
    ):
        self.sensor_data_repo = sensor_data_repo
        self.wellness_checkin_repo = wellness_checkin_repo
        self.prefs_repo = prefs_repo
        self.risk_engine = risk_engine
        self.pattern_engine = pattern_engine
        self.physical_weight = physical_weight
        self.mental_weight = mental_weight
        self.stability_weight = stability_weight
        self.neutral_mood_default = neutral_mood_default
        self.anomaly_window = anomaly_window

    def _compute_components(self, data_snapshot: Dict[str, Any]) -> Dict[str, float]:
        risk_score = data_snapshot.get("risk_score", 0.0) or 0.0
        anomaly_rate = data_snapshot.get("anomaly_rate", 0.0) or 0.0
        recent_mood_avg = data_snapshot.get("recent_mood_avg")
        if recent_mood_avg is None:
            recent_mood_avg = self.neutral_mood_default

        physical = max(0.0, min(100.0, 100.0 - risk_score))
        mental = max(0.0, min(100.0, recent_mood_avg))
        stability = max(0.0, min(100.0, 100.0 - anomaly_rate * 100.0))

        return {"physical": round(physical, 1), "mental": round(mental, 1), "stability": round(stability, 1)}

    async def calculate_wellness_score(self, user_id: UUID, data_snapshot: Dict[str, Any]) -> int:
        components = self._compute_components(data_snapshot)
        overall = (
            components["physical"] * self.physical_weight
            + components["mental"] * self.mental_weight
            + components["stability"] * self.stability_weight
        )
        return int(round(max(0.0, min(100.0, overall))))

    async def _build_snapshot(self, user_id: UUID) -> Dict[str, Any]:
        """Gather the objective + subjective signals needed for a breakdown."""
        risk_score = 0.0
        anomaly_rate = 0.0
        recent_mood_avg: Optional[float] = None

        if self.sensor_data_repo is not None:
            recent_rows = await self.sensor_data_repo.get_history(user_id=user_id, skip=0, limit=self.anomaly_window, sort_by="desc")
            if recent_rows:
                latest = recent_rows[0]
                telemetry = {
                    "heart_rate": latest.heart_rate,
                    "temperature": latest.temperature,
                    "noise": latest.noise,
                    "blood_oxygen": latest.blood_oxygen,
                }
                preferences = {}
                if self.prefs_repo is not None:
                    prefs = await self.prefs_repo.get_by_user_id(user_id)
                    if prefs is not None:
                        preferences = {
                            "preferred_temperature": prefs.preferred_temperature,
                            "preferred_noise": prefs.preferred_noise,
                        }
                if self.risk_engine is not None:
                    risk_result = await self.risk_engine.evaluate_current_risk(telemetry, preferences)
                    risk_score = risk_result["risk_score"]

                if self.pattern_engine is not None:
                    telemetry_window = [
                        {
                            "heart_rate": r.heart_rate,
                            "temperature": r.temperature,
                            "noise": r.noise,
                            "blood_oxygen": r.blood_oxygen,
                        }
                        for r in recent_rows
                    ]
                    anomalies = await self.pattern_engine.detect_anomalies(user_id, telemetry_window)
                    if anomalies:
                        anomaly_rate = sum(1 for a in anomalies if a["is_anomaly"]) / len(anomalies)

        if self.wellness_checkin_repo is not None:
            checkins = await self.wellness_checkin_repo.get_recent(user_id, limit=7)
            if checkins:
                recent_mood_avg = sum(c.mood_score for c in checkins) / len(checkins)

        return {
            "risk_score": risk_score,
            "anomaly_rate": anomaly_rate,
            "recent_mood_avg": recent_mood_avg,
        }

    async def get_wellness_breakdown(self, user_id: UUID) -> Dict[str, float]:
        snapshot = await self._build_snapshot(user_id)
        components = self._compute_components(snapshot)
        overall = await self.calculate_wellness_score(user_id, snapshot)
        return {**components, "overall": float(overall)}
