from typing import Any, Dict

WELLNESS_FEATURE_KEYS = ["risk_score", "anomaly_rate", "recent_mood_avg"]


def build_wellness_feature_dict(
    data_snapshot: Dict[str, Any], neutral_mood_default: float = 70.0
) -> Dict[str, float]:
    """
    Derive the ML WellnessEngine's feature set from a snapshot of objective
    (risk_score, anomaly_rate) and subjective (recent_mood_avg) signals.
    A missing self-report defaults to a neutral midpoint rather than 0,
    since "no check-in yet" isn't evidence of poor wellness.
    """
    risk_score = data_snapshot.get("risk_score", 0.0) or 0.0
    anomaly_rate = data_snapshot.get("anomaly_rate", 0.0) or 0.0
    recent_mood_avg = data_snapshot.get("recent_mood_avg")
    if recent_mood_avg is None:
        recent_mood_avg = neutral_mood_default

    return {
        "risk_score": float(risk_score),
        "anomaly_rate": float(anomaly_rate),
        "recent_mood_avg": float(recent_mood_avg),
    }
