"""
wellness/data_loader.py
-----------------------
DataLoader for the AURA Wellness Model training pipeline.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

import pandas as pd

from .config import (
    CSV_PATTERN,
    DATA_DIR,
    RANDOM_STATE,
)

logger = logging.getLogger(__name__)


class DataLoaderError(RuntimeError):
    """Raised when data cannot be loaded."""


class SchemaValidationError(ValueError):
    """Raised when dataset fails schema checks."""


def load_and_merge() -> pd.DataFrame:
    """Load every aura_*_cleaned.csv file and merge."""
    csv_files: List[Path] = sorted(DATA_DIR.glob(CSV_PATTERN))
    if not csv_files:
        raise DataLoaderError(f"No CSV files found in {DATA_DIR} matching {CSV_PATTERN}.")

    logger.info("Discovered %d CSV file(s) in %s", len(csv_files), DATA_DIR)

    frames: List[pd.DataFrame] = []
    reference_columns: Optional[List[str]] = None

    for path in csv_files:
        logger.info("  Loading %s ...", path.name)
        df = pd.read_csv(path, low_memory=False)

        if reference_columns is None:
            reference_columns = sorted(df.columns.tolist())
        else:
            file_columns = sorted(df.columns.tolist())
            if file_columns != reference_columns:
                raise SchemaValidationError(f"{path.name} columns mismatch.")

        _assert_raw_columns_present(df, path.name)
        frames.append(df)

    merged = pd.concat(frames, ignore_index=True)
    logger.info("Merged dataset shape: %s", merged.shape)

    return merged


def validate_dataset(df: pd.DataFrame) -> None:
    """Validate dataset structure and check for missing values."""
    logger.info("Validating dataset ...")
    missing = df.isnull().sum()
    cols_with_missing = missing[missing > 0]
    if not cols_with_missing.empty:
        logger.warning("Missing values detected:\n%s", cols_with_missing.to_string())

    n_dupes = df.duplicated().sum()
    if n_dupes > 0:
        logger.warning("%d duplicate rows detected.", n_dupes)


def drop_duplicates_and_shuffle(df: pd.DataFrame) -> pd.DataFrame:
    before = len(df)
    df = df.drop_duplicates()
    df = df.sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)
    dropped = before - len(df)
    if dropped > 0:
        logger.info("Dropped %d duplicate rows.", dropped)
    logger.info("Shuffled dataset (random_state=%d). Shape: %s", RANDOM_STATE, df.shape)
    return df


def _assert_raw_columns_present(df: pd.DataFrame, filename: str) -> None:
    required = {
        "age",
        "heart_rate",
        "blood_oxygen",
        "body_temperature",
        "ambient_temperature",
        "humidity",
        "noise_db",
        "stress_feedback",
        "gender",
        "activity",
        "location_type",
        "time_of_day",
        "day_of_week",
    }
    missing = required - set(df.columns)
    if missing:
        raise SchemaValidationError(f"{filename} is missing required columns: {missing}")
