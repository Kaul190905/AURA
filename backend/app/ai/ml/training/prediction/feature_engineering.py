"""
prediction/feature_engineering.py
---------------------------------
Feature engineering for the AURA Overload Prediction model.

For each user, we sort by timestamp and compute:
1. current_risk using the standard RiskEngine heuristic formula.
2. previous_risk (lag 1 of current_risk).
3. rolling_mean (rolling mean of current_risk over a 30s window).
4. rolling_std (rolling standard deviation of current_risk over a 30s window).
5. slope (linear rate of change of current_risk over a 30s window).
6. moving averages (moving_avg_short and moving_avg_long).
7. time features (hour, minute, day_of_week_num).
8. target column (overload_next_30s, which is current_risk 6 steps ahead).
"""

from __future__ import annotations

import logging
import pandas as pd

logger = logging.getLogger(__name__)

# Numeric features engineered in this step
ENGINEERED_NUMERIC_COLS = [
    "previous_risk",
    "rolling_mean",
    "rolling_std",
    "slope",
    "moving_avg_short",
    "moving_avg_long",
    "hour",
    "minute",
    "day_of_week_num",
]


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply prediction feature engineering to the raw dataset in-place.
    """
    logger.info("Computing current_risk using RiskEngine heuristic ...")

    # Vectorised, fast calculation of current risk score (0-100)
    hr = df["heart_rate"].fillna(75.0)
    temp = df["ambient_temperature"].fillna(22.0)
    noise = df["noise_db"].fillna(55.0)

    # Penalties
    hr_penalty = ((hr - 100.0) * 2.0).clip(lower=0.0, upper=40.0)
    temp_diff = (temp - 22.0).abs()
    temp_penalty = ((temp_diff - 2.0) * 10.0).clip(lower=0.0, upper=30.0)
    noise_diff = noise - 60.0
    noise_penalty = ((noise_diff - 10.0) * 1.5).clip(lower=0.0, upper=30.0)

    df["current_risk"] = (hr_penalty + temp_penalty + noise_penalty).clip(lower=0.0, upper=100.0)

    logger.info("Computing temporal / rolling / time features grouped by user ...")
    
    # Sort values by user and timestamp to ensure correct chronological shifts
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(by=["user_id", "timestamp"]).reset_index(drop=True)

    grouped = df.groupby("user_id")

    # 1. Previous risk (lag 1 of risk)
    df["previous_risk"] = grouped["current_risk"].shift(1).fillna(df["current_risk"])

    # 2. Rolling mean (30s window = 6 readings of 5s)
    df["rolling_mean"] = (
        grouped["current_risk"]
        .transform(lambda x: x.rolling(window=6, min_periods=1).mean())
    )

    # 3. Rolling standard deviation (30s window, minimum 2 readings)
    df["rolling_std"] = (
        grouped["current_risk"]
        .transform(lambda x: x.rolling(window=6, min_periods=2).std())
        .fillna(0.0)
    )

    # 4. Slope (change over 30s / 6 readings)
    df["slope"] = (df["current_risk"] - grouped["current_risk"].shift(6)) / 6.0
    df["slope"] = df["slope"].fillna(0.0)

    # 5. Moving averages (moving_avg_short = 15s window, moving_avg_long = 60s window)
    df["moving_avg_short"] = (
        grouped["current_risk"]
        .transform(lambda x: x.rolling(window=3, min_periods=1).mean())
    )
    df["moving_avg_long"] = (
        grouped["current_risk"]
        .transform(lambda x: x.rolling(window=12, min_periods=1).mean())
    )

    # 6. Time features
    df["hour"] = df["timestamp"].dt.hour
    df["minute"] = df["timestamp"].dt.minute
    df["day_of_week_num"] = df["timestamp"].dt.dayofweek

    # 7. Target column overload_next_30s (current_risk shifted 6 steps ahead)
    df["overload_next_30s"] = grouped["current_risk"].shift(-6)

    # Drop rows where the target is NaN (at the end of each user's series)
    before_drop = len(df)
    df = df.dropna(subset=["overload_next_30s"]).reset_index(drop=True)
    logger.info(
        "Dropped %d boundary rows with NaN target overload_next_30s (remaining: %d).",
        before_drop - len(df), len(df)
    )

    return df
