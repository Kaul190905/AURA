"""
risk/splitter.py
----------------
Deterministic three-way dataset split: Train / Validation / Test.

Ratios (from config.py):
    70 % Train  |  15 % Validation  |  15 % Test

Stratification on the target column is used so every split preserves the
original class distribution — critical for imbalanced SPD-level data.
"""

from __future__ import annotations

import logging
from typing import Tuple

import numpy as np
from sklearn.model_selection import train_test_split

from .config import RANDOM_STATE, TEST_RATIO, VAL_RATIO

logger = logging.getLogger(__name__)


def three_way_split(
    X: np.ndarray,
    y: np.ndarray,
) -> Tuple[
    np.ndarray, np.ndarray,   # X_train, y_train
    np.ndarray, np.ndarray,   # X_val,   y_val
    np.ndarray, np.ndarray,   # X_test,  y_test
]:
    """
    Split (X, y) into train / validation / test sets.

    The split is performed in two stages to keep proportions exact:

    Stage 1: hold out (val + test) fraction from the full dataset.
    Stage 2: split the held-out portion evenly into validation and test.

    Parameters
    ----------
    X : np.ndarray   shape (n_samples, n_features)
    y : np.ndarray   shape (n_samples,)

    Returns
    -------
    X_train, y_train, X_val, y_val, X_test, y_test
    """
    val_test_ratio = VAL_RATIO + TEST_RATIO   # e.g. 0.30

    X_train, X_val_test, y_train, y_val_test = train_test_split(
        X, y,
        test_size=val_test_ratio,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    # Within the held-out portion, split 50/50 → each becomes 15 % of total
    X_val, X_test, y_val, y_test = train_test_split(
        X_val_test, y_val_test,
        test_size=0.5,
        random_state=RANDOM_STATE,
        stratify=y_val_test,
    )

    logger.info(
        "Split → Train: %d | Val: %d | Test: %d  (total %d)",
        len(y_train), len(y_val), len(y_test), len(y),
    )
    return X_train, y_train, X_val, y_val, X_test, y_test
