"""
risk/config.py
--------------
Central configuration for the AURA Risk-Prediction Training Pipeline.

All paths, column names, model hyper-parameter search spaces, and split
ratios live here so that every other module in this package stays
parameter-free and fully testable.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# Repository root resolution
#   backend/app/ai/ml/training/risk/config.py
#   parents[0] = risk/
#   parents[1] = training/
#   parents[2] = ml/
#   parents[3] = ai/
#   parents[4] = app/
#   parents[5] = backend/
#   parents[6] = AURA/  (project root)
# ---------------------------------------------------------------------------
_THIS_FILE = Path(__file__).resolve()
_BACKEND_ROOT = _THIS_FILE.parents[5]   # …/backend/
_PROJECT_ROOT = _THIS_FILE.parents[6]   # …/AURA/ (project root)

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------
DATA_DIR: Path = _PROJECT_ROOT / "Data" / "Cleaned Data"

CSV_PATTERN: str = "aura_*_cleaned.csv"   # glob inside DATA_DIR

# ---------------------------------------------------------------------------
# Output paths
# ---------------------------------------------------------------------------
MODELS_DIR: Path = _PROJECT_ROOT / "models"
REPORTS_DIR: Path = _PROJECT_ROOT / "reports"

MODEL_PATH: Path = MODELS_DIR / "risk_model.joblib"
METRICS_PATH: Path = MODELS_DIR / "risk_metrics.json"
FEATURE_NAMES_PATH: Path = MODELS_DIR / "risk_feature_names.json"
REPORT_PATH: Path = REPORTS_DIR / "risk_training_report.md"

# ---------------------------------------------------------------------------
# Schema definition
# ---------------------------------------------------------------------------

# Column that encodes the target concept in the raw CSVs
SPD_LEVEL_COL: str = "spd_level"

# Target column we create / expect during training
TARGET_COL: str = "risk_label"

# Mapping from raw SPD strings → integer risk classes
SPD_LABEL_MAP: Dict[str, int] = {
    "Mild": 0,
    "Moderate": 1,
    "Severe": 2,
}
RISK_CLASS_NAMES: List[str] = ["LOW", "MEDIUM", "HIGH"]

# Columns to DROP before modelling (identifiers, leaky, or redundant columns)
DROP_COLS: List[str] = [
    "timestamp",
    "user_id",
    "latitude",
    "longitude",
    SPD_LEVEL_COL,   # replaced by TARGET_COL
]

# Numeric features (used as-is after imputation)
# NOTE: engineered features are appended here so preprocessor auto-includes them.
NUMERIC_COLS: List[str] = [
    "age",
    "heart_rate",
    "blood_oxygen",
    "body_temperature",
    "ambient_temperature",
    "humidity",
    "noise_db",
    "stress_feedback",
    # ── Engineered features (added by feature_engineering.add_features) ──
    "noise_heart_interaction",
    "thermal_stress",
    "spo2_deficit",
    "hr_age_ratio",
    "humidity_comfort_delta",
]

# Categorical features that will be one-hot encoded
CATEGORICAL_COLS: List[str] = [
    "gender",
    "activity",
    "location_type",
    "time_of_day",
    "day_of_week",
]

# ---------------------------------------------------------------------------
# Train / validation / test split ratios
# ---------------------------------------------------------------------------
TRAIN_RATIO: float = 0.70
VAL_RATIO: float = 0.15
TEST_RATIO: float = 0.15
RANDOM_STATE: int = 42

# ---------------------------------------------------------------------------
# Gradient Boosting hyper-parameter search space
#
# Strategy: Two-phase training.
#
# Phase 1 — CV SEARCH (fast):  Use n_estimators=50 with a small 20k-row
#   stratified subsample. This quickly identifies the best max_depth,
#   learning_rate, and subsample combination. GBC is sequential by design
#   so n_estimators is the dominant cost driver.
#
# Phase 2 — FULL REFIT (quality): Refit the best params on 100% of the
#   training data with FINAL_N_ESTIMATORS=300 for a production-quality model.
# ---------------------------------------------------------------------------

# Search grid — kept deliberately compact so CV finishes in ~2 minutes
SEARCH_PARAM_GRID: Dict[str, List[Any]] = {
    "max_depth":      [3, 5],
    "learning_rate":  [0.05, 0.1],
    "subsample":      [0.8],
    "min_samples_split": [20],
}

# Fixed for search phase (low = fast CV)
SEARCH_N_ESTIMATORS: int = 50

# Used for the full-data refit after best params are found
FINAL_N_ESTIMATORS: int = 150

CV_FOLDS: int = 3           # k-fold cross-validation during grid search
N_ITER_RANDOM: int = 8      # RandomizedSearchCV iterations (used as fallback)
SCORING_METRIC: str = "f1_weighted"
N_JOBS: int = -1            # parallelise the CV folds (not the GBC trees)

# Max rows used during CV hyperparameter search (stratified subsample).
CV_SUBSAMPLE_SIZE: int = 20_000

# Max rows used for the final refitting (stratified subsample).
# Refitting GBC on 672k rows is too slow on single CPU cores, so we train
# the final model on 150k representative rows.
REFIT_SUBSAMPLE_SIZE: int = 150_000
