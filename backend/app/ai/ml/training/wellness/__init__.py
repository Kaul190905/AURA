"""
wellness/__init__.py
--------------------
Public interface of the wellness model training package.
"""

from .config import (
    DATA_DIR,
    MODEL_PATH,
    METRICS_PATH,
    FEATURE_NAMES_PATH,
    REPORT_PATH,
    TARGET_COL,
)
from .data_loader import load_and_merge, validate_dataset, drop_duplicates_and_shuffle
from .feature_engineering import add_features
from .preprocessor import WellnessPreprocessor
from .splitter import split_dataset
from .trainer import tune_and_train
from .evaluator import evaluate
from .artifact_saver import save_all

__all__ = [
    "DATA_DIR",
    "MODEL_PATH",
    "METRICS_PATH",
    "FEATURE_NAMES_PATH",
    "REPORT_PATH",
    "TARGET_COL",
    "load_and_merge",
    "validate_dataset",
    "drop_duplicates_and_shuffle",
    "add_features",
    "WellnessPreprocessor",
    "split_dataset",
    "tune_and_train",
    "evaluate",
    "save_all",
]
