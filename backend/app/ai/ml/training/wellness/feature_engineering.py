"""
prediction/feature_engineering.py
---------------------------------
Feature engineering for the AURA Wellness model.
Computes wellness_score as the target and derives features:
- avg_heart_rate (rolling 1-min avg)
- avg_noise (rolling 1-min avg)
- avg_temperature (rolling 1-min avg)
- stress_index (composite heart rate + stress feedback)
- recent_overload_frequency (rolling window proportion of risk > 67.0)
- daily_avg_hr, daily_avg_noise, daily_avg_temp (daily averages per user)
"""

from __future__ import annotations

import logging
import pandas as pd

logger = logging.getLogger(__name__)

# Engineered numeric features
ENGINEERED_NUMERIC_COLS = [
    "avg_heart_rate",
    "avg_noise",
    "avg_temperature",
    "stress_index",
    "recent_overload_frequency",
    "daily_avg_hr",
    "daily_avg_noise",
    "daily_avg_temp",
]


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply wellness feature engineering and target calculation.
    """
    logger.info("Parsing timestamp dates ...")
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["date"] = df["timestamp"].dt.date
    
    # Sort values by user and timestamp to ensure correct chronological shifts
    df = df.sort_values(by=["user_id", "timestamp"]).reset_index(drop=True)

    # ── Target: wellness_score (0-100 scale) ──
    # Formula uses HR, SpO2, Noise, and Stress Feedback:
    logger.info("Computing target wellness_score ...")
    hr = df["heart_rate"].fillna(75.0)
    spo2 = df["blood_oxygen"].fillna(98.0)
    noise = df["noise_db"].fillna(55.0)
    stress = df["stress_feedback"].fillna(1.0)

    hr_penalty = ((hr - 75.0).abs() - 10.0).clip(lower=0.0) * 1.5
    hr_penalty = hr_penalty.clip(upper=30.0)

    spo2_penalty = ((100.0 - spo2) * 5.0).clip(lower=0.0, upper=30.0)
    stress_penalty = ((stress - 1.0) * 20.0).clip(lower=0.0, upper=40.0)
    noise_penalty = ((noise - 65.0) * 0.5).clip(lower=0.0, upper=15.0)

    df["wellness_score"] = (100.0 - (hr_penalty + spo2_penalty + stress_penalty + noise_penalty)).clip(lower=0.0, upper=100.0)

    # ── Derived Features ──
    logger.info("Computing derived rolling features grouped by user ...")
    grouped = df.groupby("user_id")

    # Rolling window of 12 readings (1 minute of 5s intervals)
    df["avg_heart_rate"] = grouped["heart_rate"].transform(lambda x: x.rolling(window=12, min_periods=1).mean())
    df["avg_noise"] = grouped["noise_db"].transform(lambda x: x.rolling(window=12, min_periods=1).mean())
    df["avg_temperature"] = grouped["ambient_temperature"].transform(lambda x: x.rolling(window=12, min_periods=1).mean())

    # Stress Index: composite of normalized HR and stress feedback
    df["stress_index"] = ((df["heart_rate"].fillna(75.0) - 60.0) / 40.0).clip(lower=0.0) * 0.3 + (df["stress_feedback"].fillna(1.0) - 1.0) * 0.7

    # Recent Overload Frequency: fraction of readings in the window where a risk heuristic is high
    # Let's compute a simple local risk estimate:
    temp_diff = (df["ambient_temperature"].fillna(22.0) - 22.0).abs()
    noise_diff = (df["noise_db"].fillna(55.0) - 60.0).clip(lower=0.0)
    hr_diff = (df["heart_rate"].fillna(75.0) - 100.0).clip(lower=0.0)
    
    local_risk = (hr_diff * 2.0 + temp_diff * 10.0 + noise_diff * 1.5).clip(lower=0.0, upper=100.0)
    df["_temp_is_overload"] = (local_risk > 67.0).astype(int)
    
    df["recent_overload_frequency"] = (
        df.groupby("user_id")["_temp_is_overload"]
        .transform(lambda x: x.rolling(window=12, min_periods=1).mean())
    )
    df = df.drop(columns=["_temp_is_overload"])

    # ── Daily Averages ──
    logger.info("Computing user daily averages ...")
    daily_grouped = df.groupby(["user_id", "date"])[["heart_rate", "noise_db", "ambient_temperature"]].transform("mean")
    df["daily_avg_hr"] = daily_grouped["heart_rate"]
    df["daily_avg_noise"] = daily_grouped["noise_db"]
    df["daily_avg_temp"] = daily_grouped["ambient_temperature"]

    return df
