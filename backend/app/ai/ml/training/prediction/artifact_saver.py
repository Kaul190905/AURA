"""
prediction/artifact_saver.py
----------------------------
Saves all training artifacts for the AURA Overload Prediction Model.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

import joblib
from sklearn.ensemble import GradientBoostingRegressor

from .config import (
    FEATURE_NAMES_PATH,
    METRICS_PATH,
    MODEL_PATH,
    MODELS_DIR,
    REPORT_PATH,
    REPORTS_DIR,
    TRAIN_RATIO,
    VAL_RATIO,
    TEST_RATIO,
)
from .preprocessor import PredictionPreprocessor

logger = logging.getLogger(__name__)


def save_all(
    model: GradientBoostingRegressor,
    preprocessor: PredictionPreprocessor,
    metrics: Dict[str, Any],
    tuning_meta: Dict[str, Any],
    n_total_samples: int,
    csv_files_used: List[str],
) -> None:
    """
    Persist prediction model training artifacts to the filesystem.
    """
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    _save_model(model, preprocessor)
    _save_metrics(metrics, tuning_meta)
    _save_feature_names(preprocessor.feature_names_out)
    _save_report(metrics, tuning_meta, n_total_samples, csv_files_used, preprocessor.feature_names_out)

    logger.info("All prediction model artefacts saved successfully.")


def _save_model(model: GradientBoostingRegressor, preprocessor: PredictionPreprocessor) -> None:
    bundle = {
        "model": model,
        "preprocessor": preprocessor,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    joblib.dump(bundle, MODEL_PATH)
    size_mb = MODEL_PATH.stat().st_size / (1024 * 1024)
    logger.info("Model bundle saved -> %s (%.2f MB)", MODEL_PATH, size_mb)


def _save_metrics(metrics: Dict[str, Any], tuning_meta: Dict[str, Any]) -> None:
    payload = {
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "tuning": tuning_meta,
        "evaluation": {k: v for k, v in metrics.items()},
    }
    METRICS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    logger.info("Metrics saved -> %s", METRICS_PATH)


def _save_feature_names(feature_names: List[str]) -> None:
    FEATURE_NAMES_PATH.write_text(
        json.dumps(feature_names, indent=2), encoding="utf-8"
    )
    logger.info("Feature names saved -> %s", FEATURE_NAMES_PATH)


def _save_report(
    metrics: Dict[str, Any],
    tuning_meta: Dict[str, Any],
    n_total_samples: int,
    csv_files_used: List[str],
    feature_names: List[str],
) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    feat_imp = metrics["feature_importance"]

    # Feature importance table
    fi_header = "| Rank | Feature | Importance |"
    fi_sep = "|---|---|---|"
    fi_rows = [
        f"| {f['rank']} | `{f['feature']}` | {f['importance']:.6f} |"
        for f in feat_imp[:15]
    ]
    fi_table = "\n".join([fi_header, fi_sep] + fi_rows)

    csv_list = "\n".join(f"- `{f}`" for f in csv_files_used)

    report = f"""# AURA Overload Prediction Model — Training Report

**Generated**: {now}

---

## 1. Dataset

| Property | Value |
|---|---|
| Total samples (after temporal offset engineering) | {n_total_samples:,} |
| CSV files loaded | {len(csv_files_used)} |
| Target column | `overload_next_30s` (future risk score 30 seconds ahead) |
| Split ratio | Train {int(TRAIN_RATIO*100)}% / Val {int(VAL_RATIO*100)}% / Test {int(TEST_RATIO*100)}% |
| Test samples | {metrics['test_samples']:,} |

### CSV Files Used

{csv_list}

---

## 2. Feature Engineering

**Temporal, rolling, time, and engineered features** added:

| Feature | Description |
|---|---|
| `previous_risk` | Lag 1 value of computed risk score |
| `rolling_mean` | Rolling average of risk score over 30s window |
| `rolling_std` | Rolling standard deviation of risk score over 30s window |
| `slope` | Rate of change of risk score over 30s window |
| `moving_avg_short` | Moving average over 15s window |
| `moving_avg_long` | Moving average over 60s window |
| `hour` | Hour value extracted from timestamp |
| `minute` | Minute value extracted from timestamp |
| `day_of_week_num` | Numerical day of week value |

Total feature count after one-hot encoding: **{len(feature_names)}**

---

## 3. Preprocessing

- **Numeric columns**: Median imputation -> Standard scaling
- **Categorical columns**: Mode imputation -> One-hot encoding (`handle_unknown="ignore"`)
- Preprocessor bundled **with** the model artifact for inference consistency

---

## 4. Hyperparameter Tuning (Two-Phase)

| Property | Value |
|---|---|
| Search strategy | {tuning_meta['search_type']} |
| Phase 1: CV rows (stratified subsample) | {tuning_meta.get('cv_subsample_size', 'N/A'):,} |
| Phase 1: n_estimators (search) | {tuning_meta.get('search_n_estimators', 'N/A')} |
| Phase 2: Full training rows (total train split) | {tuning_meta.get('full_train_size', 'N/A'):,} |
| Phase 2: Refitted training rows (refit subset) | {tuning_meta.get('refit_size', 'N/A'):,} |
| Phase 2: n_estimators (final model) | {tuning_meta.get('final_n_estimators', 'N/A')} |
| CV folds | {tuning_meta['cv_folds']} |
| Scoring metric | `{tuning_meta['scoring_metric']}` |
| Candidates evaluated | {tuning_meta['n_candidates_evaluated']} |
| Best CV score (Negative MAE) | {tuning_meta['best_cv_score']:.4f} |
| Validation MAE | {tuning_meta['val_mae']:.4f} |
| Wall-clock time | {tuning_meta['wall_time_seconds']:.1f} s |

### Best Hyperparameters (Final Model)

```json
{json.dumps(tuning_meta['best_params'], indent=2)}
```

---

## 5. Test Set Evaluation

| Metric | Value |
|---|---|
| **Mean Absolute Error (MAE)** | **{metrics['mae']:.4f}** |
| **Root Mean Squared Error (RMSE)** | **{metrics['rmse']:.4f}** |
| **R² Score** | **{metrics['r2']:.4f}** |

---

## 6. Feature Importance (Top 15)

{fi_table}

---

## 7. Saved Artefacts

| File | Description |
|---|---|
| `models/prediction_model.joblib` | Bundled regressor + preprocessor |
| `models/prediction_metrics.json` | Full evaluation metrics |
| `models/prediction_feature_names.json` | Ordered feature names (for inference) |
| `reports/prediction_training_report.md` | This report |

---

*AURA Prediction Pipeline — Capgemini T4PF*
"""

    REPORT_PATH.write_text(report, encoding="utf-8")
    logger.info("Training report saved -> %s", REPORT_PATH)
