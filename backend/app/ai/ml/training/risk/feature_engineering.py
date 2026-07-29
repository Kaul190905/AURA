"""
risk/feature_engineering.py
---------------------------
Optional domain-aware feature-engineering step applied **after** loading
raw data and **before** preprocessing.

All new columns created here must be purely numeric so that the downstream
RiskPreprocessor can handle them without extra config changes.

Currently engineered features
-------------------------------
noise_heart_interaction   : noise_db  × heart_rate / 10 000
                            High noise + high heart rate is a compound stress
                            signal in sensory-processing disorder contexts.
thermal_stress            : |body_temperature − ambient_temperature|
                            A large delta indicates thermoregulation effort.
spo2_deficit              : max(0, 100 − blood_oxygen)
                            Converts SpO2 into a "deficit from perfect" score.
hr_age_ratio              : heart_rate / (age + 1)
                            Normalises resting HR against expected age range.
humidity_comfort_delta    : |humidity − 50|
                            50 % RH is the WHO comfort midpoint; deviation
                            drives discomfort for SPD users.
"""

from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger(__name__)

# These columns are added to NUMERIC_COLS at import time so the preprocessor
# picks them up automatically (see config.py).
ENGINEERED_NUMERIC_COLS = [
    "noise_heart_interaction",
    "thermal_stress",
    "spo2_deficit",
    "hr_age_ratio",
    "humidity_comfort_delta",
]


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add engineered features to *df* in-place (returns the same frame).

    This function is idempotent — calling it twice on the same frame is safe.
    All arithmetic is guarded against division-by-zero.

    Parameters
    ----------
    df : pd.DataFrame
        Raw merged DataFrame **before** calling RiskPreprocessor.

    Returns
    -------
    pd.DataFrame  (same object, mutated)
    """
    logger.info("Engineering additional features …")

    # 1. Compound sensory load
    df["noise_heart_interaction"] = (
        df["noise_db"].fillna(0) * df["heart_rate"].fillna(0) / 10_000.0
    )

    # 2. Thermoregulation effort
    df["thermal_stress"] = (
        df["body_temperature"].fillna(37.0) - df["ambient_temperature"].fillna(22.0)
    ).abs()

    # 3. SpO2 deficit
    df["spo2_deficit"] = (100.0 - df["blood_oxygen"].fillna(100.0)).clip(lower=0.0)

    # 4. Heart-rate normalised by age
    df["hr_age_ratio"] = df["heart_rate"].fillna(0) / (df["age"].fillna(1) + 1)

    # 5. Humidity deviation from comfort midpoint
    df["humidity_comfort_delta"] = (df["humidity"].fillna(50.0) - 50.0).abs()

    logger.info("Engineered %d new features.", len(ENGINEERED_NUMERIC_COLS))
    return df
