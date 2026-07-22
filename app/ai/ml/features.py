from typing import Any, Dict, List, Optional, Sequence

import numpy as np

DEFAULT_FEATURE_KEYS: List[str] = ["heart_rate", "blood_oxygen", "temperature", "noise"]


def build_feature_matrix(
    records: Sequence[Dict[str, Any]],
    feature_keys: Sequence[str] = DEFAULT_FEATURE_KEYS,
) -> np.ndarray:
    """
    Convert a sequence of telemetry dicts into a numeric feature matrix.

    Missing values (None / absent keys) are imputed with the column mean
    rather than 0, since a single missing sensor reading isn't a real
    physiological extreme and shouldn't be scored as one.
    """
    raw: List[List[Optional[float]]] = [
        [record.get(key) for key in feature_keys] for record in records
    ]

    n_rows = len(raw)
    n_cols = len(feature_keys)
    matrix = np.zeros((n_rows, n_cols), dtype=float)

    for col in range(n_cols):
        column_values = [row[col] for row in raw]
        known = [float(v) for v in column_values if v is not None]
        fill_value = float(np.mean(known)) if known else 0.0
        matrix[:, col] = [float(v) if v is not None else fill_value for v in column_values]

    return matrix
