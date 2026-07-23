from abc import ABC, abstractmethod
from typing import Any, Dict, List
from uuid import UUID

class IRiskEngine(ABC):
    """
    Interface for the Risk Engine.
    Responsible for assessing real-time and historical risks for a user.
    """

    @abstractmethod
    async def evaluate_current_risk(self, telemetry: Dict[str, Any], preferences: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate the immediate risk level based on sensor data and user preferences.
        """
        pass

    @abstractmethod
    async def analyze_historical_risk(self, user_id: UUID, time_window_days: int) -> Dict[str, Any]:
        """
        Analyze the user's historical data over a given time window to determine risk trends.
        """
        pass


class RiskEngine(IRiskEngine):
    """
    Concrete implementation of the Risk Engine.
    Follows object-oriented design and remains independent of any FastAPI components.
    Can be instantiated and called by any service layer.
    """

    def __init__(self, hr_threshold: float = 100.0, temp_tolerance: float = 2.0, noise_tolerance: float = 10.0):
        # Baseline configurable thresholds for risk logic
        self.hr_threshold = hr_threshold
        self.temp_tolerance = temp_tolerance
        self.noise_tolerance = noise_tolerance

    def _calculate_score(self, noise: float, temp: float, hr: float, pref_noise: float, pref_temp: float) -> tuple[float, List[str]]:
        reasons = []
        score = 0.0

        # Heart Rate contribution (capping at 40 points)
        if hr > self.hr_threshold:
            hr_penalty = min((hr - self.hr_threshold) * 2.0, 40.0)
            score += hr_penalty
            reasons.append(f"Elevated heart rate ({hr} bpm).")

        # Temperature deviation (capping at 30 points)
        temp_diff = abs(temp - pref_temp)
        if temp_diff > self.temp_tolerance:
            temp_penalty = min((temp_diff - self.temp_tolerance) * 10.0, 30.0)
            score += temp_penalty
            if temp > pref_temp:
                reasons.append(f"Temperature is higher than preferred by {temp_diff:.1f}°C.")
            else:
                reasons.append(f"Temperature is lower than preferred by {temp_diff:.1f}°C.")

        # Noise deviation (capping at 30 points)
        # We only penalize if it's louder than preferred
        noise_diff = noise - pref_noise
        if noise_diff > self.noise_tolerance:
            noise_penalty = min((noise_diff - self.noise_tolerance) * 1.5, 30.0)
            score += noise_penalty
            reasons.append(f"Noise level is higher than preferred by {noise_diff:.1f} dB.")

        # Ensure score stays strictly within 0-100 range
        return min(max(score, 0.0), 100.0), reasons

    def _determine_level(self, score: float) -> str:
        if score < 34:
            return "LOW"
        elif score < 67:
            return "MEDIUM"
        return "HIGH"

    async def evaluate_current_risk(self, telemetry: Dict[str, Any], preferences: Dict[str, Any]) -> Dict[str, Any]:
        """
        Computes the current risk score, level, and reasons based on incoming telemetry and the user's base preferences.
        """
        # Safely extract values with sensible defaults if missing
        noise = telemetry.get("noise", 0.0) or 0.0
        temp = telemetry.get("temperature", 0.0) or 0.0
        hr = telemetry.get("heart_rate", 0.0) or 0.0
        
        pref_noise = preferences.get("preferred_noise", 60.0) or 60.0
        pref_temp = preferences.get("preferred_temperature", 22.0) or 22.0

        # Run business logic to calculate risk
        score, reasons = self._calculate_score(noise, temp, hr, pref_noise, pref_temp)
        risk_level = self._determine_level(score)
        
        if score == 0.0 and not reasons:
            reasons.append("All metrics are within optimal and preferred ranges.")

        return {
            "risk_score": round(score, 1),
            "risk_level": risk_level,
            "reasons": reasons
        }

    async def analyze_historical_risk(self, user_id: UUID, time_window_days: int) -> Dict[str, Any]:
        """
        Placeholder for historical analysis logic.
        """
        return {"status": "not_implemented"}
