"""
risk/__init__.py
----------------
Public surface of the risk training sub-package.
"""
from .config import (
    DATA_DIR,
    MODEL_PATH,
    METRICS_PATH,
    FEATURE_NAMES_PATH,
    REPORT_PATH,
    TARGET_COL,
    RISK_CLASS_NAMES,
)
from .data_loader import load_and_merge, validate_dataset, drop_duplicates
from .feature_engineering import add_features
from .preprocessor import RiskPreprocessor
from .splitter import three_way_split
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
    "RISK_CLASS_NAMES",
    "load_and_merge",
    "validate_dataset",
    "drop_duplicates",
    "add_features",
    "RiskPreprocessor",
    "three_way_split",
    "tune_and_train",
    "evaluate",
    "save_all",
]
