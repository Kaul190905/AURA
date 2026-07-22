from typing import Any, Dict, List

RISK_FEATURE_KEYS: List[str] = [
    "heart_rate",
    "temperature",
    "noise",
    "blood_oxygen",
    "temp_deviation",
    "noise_deviation",
]


def build_risk_feature_dict(telemetry: Dict[str, Any], preferences: Dict[str, Any]) -> Dict[str, float]:
    """
    Derive the ML RiskEngine's feature set from raw telemetry + preferences.

    Mirrors the inputs the rule-based RiskEngine uses (hr/temp/noise plus
    deviation from preferred temp/noise) so both engines are comparable and
    the distilled bootstrap training set is a faithful approximation.
    """
    hr = telemetry.get("heart_rate", 0.0) or 0.0
    temp = telemetry.get("temperature", 0.0) or 0.0
    noise = telemetry.get("noise", 0.0) or 0.0
    spo2 = telemetry.get("blood_oxygen", 98.0) or 98.0

    pref_noise = preferences.get("preferred_noise", 60.0) or 60.0
    pref_temp = preferences.get("preferred_temperature", 22.0) or 22.0

    return {
        "heart_rate": float(hr),
        "temperature": float(temp),
        "noise": float(noise),
        "blood_oxygen": float(spo2),
        "temp_deviation": float(temp - pref_temp),
        "noise_deviation": float(noise - pref_noise),
    }
