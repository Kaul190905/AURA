from typing import Dict, List

import numpy as np

TRAJECTORY_FEATURE_KEYS: List[str] = ["last_value", "mean", "std", "slope", "n_points"]


def build_trajectory_features(risk_scores: List[float]) -> Dict[str, float]:
    """
    Summarize a risk-score trajectory (a short recent window of scores, e.g.
    the last 5-15 readings) into fixed-length features for the overload
    forecasting model.
    """
    clean = [v for v in risk_scores if v is not None]
    if not clean:
        return {"last_value": 0.0, "mean": 0.0, "std": 0.0, "slope": 0.0, "n_points": 0.0}

    arr = np.array(clean, dtype=float)
    n = len(arr)
    slope = float(np.polyfit(np.arange(n), arr, 1)[0]) if n > 1 else 0.0

    return {
        "last_value": float(arr[-1]),
        "mean": float(arr.mean()),
        "std": float(arr.std()),
        "slope": slope,
        "n_points": float(n),
    }
