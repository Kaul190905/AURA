"""
wellness/config.py
------------------
Central configuration for the AURA Wellness-Model Training Pipeline.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# Repository root resolution
# ---------------------------------------------------------------------------
_THIS_FILE = Path(__file__).resolve()
_BACKEND_ROOT = _THIS_FILE.parents[5]   # …/backend/
_PROJECT_ROOT = _THIS_FILE.parents[6]   # …/AURA/ (project root)

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------
DATA_DIR: Path = _PROJECT_ROOT / "Data" / "Cleaned Data"

CSV_PATTERN: str = "aura_*_cleaned.csv"

# ---------------------------------------------------------------------------
# Output paths
# ---------------------------------------------------------------------------
MODELS_DIR: Path = _PROJECT_ROOT / "models"
REPORTS_DIR: Path = _PROJECT_ROOT / "reports"

MODEL_PATH: Path = MODELS_DIR / "wellness_model.joblib"
METRICS_PATH: Path = MODELS_DIR / "wellness_metrics.json"
FEATURE_NAMES_PATH: Path = MODELS_DIR / "wellness_feature_names.json"
REPORT_PATH: Path = REPORTS_DIR / "wellness_training_report.md"

# ---------------------------------------------------------------------------
# Schema definition
# ---------------------------------------------------------------------------

TARGET_COL: str = "wellness_score"

# Columns to DROP before model training
DROP_COLS: List[str] = [
    "timestamp",
    "user_id",
    "latitude",
    "longitude",
    "spd_level",
    "date",
]

# Numeric features (including temporal, rolling, daily averages, and engineered features)
NUMERIC_COLS: List[str] = [
    "age",
    "heart_rate",
    "blood_oxygen",
    "body_temperature",
    "ambient_temperature",
    "humidity",
    "noise_db",
    "stress_feedback",
    # ── Derived Features ──
    "avg_heart_rate",
    "avg_noise",
    "avg_temperature",
    "stress_index",
    "recent_overload_frequency",
    "daily_avg_hr",
    "daily_avg_noise",
    "daily_avg_temp",
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
# Gradient Boosting Regressor hyper-parameter search space
# ---------------------------------------------------------------------------
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

CV_FOLDS: int = 3
N_ITER_RANDOM: int = 8
SCORING_METRIC: str = "neg_mean_absolute_error"
N_JOBS: int = -1

# Max rows used during CV hyperparameter search
CV_SUBSAMPLE_SIZE: int = 20_000

# Max rows used for the final refitting
REFIT_SUBSAMPLE_SIZE: int = 150_000
