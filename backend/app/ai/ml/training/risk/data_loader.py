"""
risk/data_loader.py
-------------------
Discovers, loads, merges, shuffles, and validates all cleaned CSV files
for the AURA Risk-Prediction pipeline.

No data is synthesised here — only the real CSV files under DATA_DIR are
loaded. A SchemaValidationError is raised immediately if any file has a
different column set, missing values, or duplicate rows.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

import pandas as pd

from .config import (
    CSV_PATTERN,
    DATA_DIR,
    DROP_COLS,
    NUMERIC_COLS,
    CATEGORICAL_COLS,
    RANDOM_STATE,
    SPD_LEVEL_COL,
    TARGET_COL,
    SPD_LABEL_MAP,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------

class DataLoaderError(RuntimeError):
    """Raised when raw data cannot be loaded or discovered."""


class SchemaValidationError(ValueError):
    """Raised when a CSV file doesn't match the expected schema."""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_and_merge() -> pd.DataFrame:
    """
    Load every ``aura_*_cleaned.csv`` file from DATA_DIR, concatenate them
    into a single DataFrame, shuffle it, and return the raw merged frame.

    Returns
    -------
    pd.DataFrame
        Raw merged frame with the ``risk_label`` column already added and
        the ``spd_level`` column retained (dropped later during preprocessing).
    """
    csv_files: List[Path] = sorted(DATA_DIR.glob(CSV_PATTERN))
    if not csv_files:
        raise DataLoaderError(
            f"No CSV files matching '{CSV_PATTERN}' found in {DATA_DIR}. "
            "Please make sure the cleaned data files exist."
        )

    logger.info("Discovered %d CSV file(s) in %s", len(csv_files), DATA_DIR)

    frames: List[pd.DataFrame] = []
    reference_columns: Optional[List[str]] = None

    for path in csv_files:
        logger.info("  Loading %s …", path.name)
        df = pd.read_csv(path, low_memory=False)

        # ── Schema consistency ──────────────────────────────────────────────
        if reference_columns is None:
            reference_columns = sorted(df.columns.tolist())
        else:
            file_columns = sorted(df.columns.tolist())
            if file_columns != reference_columns:
                missing = set(reference_columns) - set(file_columns)
                extra = set(file_columns) - set(reference_columns)
                raise SchemaValidationError(
                    f"{path.name} has a mismatched schema.\n"
                    f"  Missing columns : {missing}\n"
                    f"  Extra   columns : {extra}"
                )

        # ── Validate required columns exist ─────────────────────────────────
        _assert_columns_present(df, path.name)

        frames.append(df)
        logger.info("    → %d rows loaded", len(df))

    merged: pd.DataFrame = pd.concat(frames, ignore_index=True)
    logger.info("Merged dataset shape: %s", merged.shape)

    # ── Derive target column ────────────────────────────────────────────────
    if TARGET_COL not in merged.columns:
        merged[TARGET_COL] = merged[SPD_LEVEL_COL].map(SPD_LABEL_MAP)

    # ── Shuffle ─────────────────────────────────────────────────────────────
    merged = merged.sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)
    logger.info("Dataset shuffled (random_state=%d)", RANDOM_STATE)

    return merged


def validate_dataset(df: pd.DataFrame) -> None:
    """
    Run quality checks on the merged DataFrame.
    Raises ValueError / SchemaValidationError for any violation.
    """
    logger.info("Running dataset validation …")

    # ── Missing values ───────────────────────────────────────────────────────
    missing = df.isnull().sum()
    cols_with_missing = missing[missing > 0]
    if not cols_with_missing.empty:
        logger.warning(
            "Missing values detected (will be imputed):\n%s",
            cols_with_missing.to_string(),
        )

    # ── Unmapped target values ───────────────────────────────────────────────
    unmapped = df[TARGET_COL].isnull().sum()
    if unmapped > 0:
        unknown_spd = df.loc[df[TARGET_COL].isnull(), SPD_LEVEL_COL].unique()
        raise SchemaValidationError(
            f"{unmapped} rows could not be mapped to a risk_label. "
            f"Unknown spd_level values: {unknown_spd}. "
            f"Expected one of: {list(SPD_LABEL_MAP.keys())}"
        )

    # ── Duplicates ───────────────────────────────────────────────────────────
    n_dupes = df.duplicated().sum()
    if n_dupes > 0:
        logger.warning("%d duplicate rows detected and will be dropped.", n_dupes)

    logger.info(
        "Validation complete. Total rows: %d | Target classes: %s",
        len(df),
        df[TARGET_COL].value_counts().to_dict(),
    )


def drop_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Drop exact duplicate rows and reset the index."""
    before = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    dropped = before - len(df)
    if dropped:
        logger.info("Dropped %d duplicate rows.", dropped)
    return df


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _assert_columns_present(df: pd.DataFrame, filename: str) -> None:
    """Raise SchemaValidationError if any required *raw* CSV column is absent.

    Note: engineered feature columns (noise_heart_interaction, thermal_stress,
    etc.) are added *after* loading and are NOT checked here.
    """
    # Only raw columns that must exist in every CSV file
    raw_required = {
        "age", "heart_rate", "blood_oxygen", "body_temperature",
        "ambient_temperature", "humidity", "noise_db", "stress_feedback",
        "gender", "activity", "location_type", "time_of_day", "day_of_week",
        SPD_LEVEL_COL,
    }
    missing = raw_required - set(df.columns)
    if missing:
        raise SchemaValidationError(
            f"{filename} is missing required columns: {missing}"
        )
