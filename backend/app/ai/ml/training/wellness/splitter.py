"""
wellness/splitter.py
--------------------
Split dataset into Train, Validation, and Test sets (70/15/15) for wellness regression.
"""

from __future__ import annotations

import logging
from typing import Tuple

import numpy as np
from sklearn.model_selection import train_test_split

from .config import RANDOM_STATE, TEST_RATIO, VAL_RATIO

logger = logging.getLogger(__name__)


def split_dataset(
    X: np.ndarray,
    y: np.ndarray,
) -> Tuple[
    np.ndarray, np.ndarray,   # X_train, y_train
    np.ndarray, np.ndarray,   # X_val, y_val
    np.ndarray, np.ndarray,   # X_test, y_test
]:
    """Split dataset into train, validation, and test splits."""
    val_test_ratio = VAL_RATIO + TEST_RATIO

    X_train, X_val_test, y_train, y_val_test = train_test_split(
        X, y,
        test_size=val_test_ratio,
        random_state=RANDOM_STATE,
    )

    X_val, X_test, y_val, y_test = train_test_split(
        X_val_test, y_val_test,
        test_size=0.5,
        random_state=RANDOM_STATE,
    )

    logger.info(
        "Split -> Train: %d | Val: %d | Test: %d (total: %d)",
        len(y_train), len(y_val), len(y_test), len(y)
    )
    return X_train, y_train, X_val, y_val, X_test, y_test
