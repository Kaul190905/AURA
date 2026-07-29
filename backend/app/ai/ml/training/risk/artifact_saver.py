"""
risk/artifact_saver.py
-----------------------
Persists all training artefacts to the file-system.

Saved files
-----------
models/risk_model.joblib          — bundled dict with model + preprocessor
models/risk_metrics.json          — full evaluation metrics
models/risk_feature_names.json    — ordered feature name list
reports/risk_training_report.md   — human-readable training report
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import joblib
from sklearn.ensemble import GradientBoostingClassifier

from .config import (
    FEATURE_NAMES_PATH,
    METRICS_PATH,
    MODEL_PATH,
    MODELS_DIR,
    REPORT_PATH,
    REPORTS_DIR,
    RISK_CLASS_NAMES,
    TRAIN_RATIO,
    VAL_RATIO,
    TEST_RATIO,
)
from .preprocessor import RiskPreprocessor

logger = logging.getLogger(__name__)


def save_all(
    model: GradientBoostingClassifier,
    preprocessor: RiskPreprocessor,
    metrics: Dict[str, Any],
    tuning_meta: Dict[str, Any],
    n_total_samples: int,
    csv_files_used: List[str],
) -> None:
    """
    Persist all training artefacts.

    Parameters
    ----------
    model            : Fitted GradientBoostingClassifier (best from tuning)
    preprocessor     : Fitted RiskPreprocessor
    metrics          : Output of evaluator.evaluate()
    tuning_meta      : Output of trainer.tune_and_train()
    n_total_samples  : Total rows in merged dataset before splitting
    csv_files_used   : List of CSV filenames used for training
    """
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    _save_model(model, preprocessor)
    _save_metrics(metrics, tuning_meta)
    _save_feature_names(preprocessor.feature_names_out)
    _save_report(metrics, tuning_meta, n_total_samples, csv_files_used, preprocessor.feature_names_out)

    logger.info("All artefacts saved successfully.")


# ---------------------------------------------------------------------------
# Private save routines
# ---------------------------------------------------------------------------

def _save_model(model: GradientBoostingClassifier, preprocessor: RiskPreprocessor) -> None:
    """Bundle model + preprocessor together so inference is atomic."""
    bundle = {
        "model": model,
        "preprocessor": preprocessor,
        "class_names": RISK_CLASS_NAMES,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    joblib.dump(bundle, MODEL_PATH)
    size_mb = MODEL_PATH.stat().st_size / (1024 * 1024)
    logger.info("Model bundle saved → %s  (%.2f MB)", MODEL_PATH, size_mb)


def _save_metrics(metrics: Dict[str, Any], tuning_meta: Dict[str, Any]) -> None:
    payload = {
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "tuning": tuning_meta,
        "evaluation": {k: v for k, v in metrics.items() if k != "classification_report"},
    }
    METRICS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    logger.info("Metrics saved → %s", METRICS_PATH)


def _save_feature_names(feature_names: List[str]) -> None:
    FEATURE_NAMES_PATH.write_text(
        json.dumps(feature_names, indent=2), encoding="utf-8"
    )
    logger.info("Feature names (%d) saved → %s", len(feature_names), FEATURE_NAMES_PATH)


def _save_report(
    metrics: Dict[str, Any],
    tuning_meta: Dict[str, Any],
    n_total_samples: int,
    csv_files_used: List[str],
    feature_names: List[str],
) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    cm = metrics["confusion_matrix"]
    cm_labels = metrics["confusion_matrix_labels"]
    feat_imp = metrics["feature_importance"]

    # ── Confusion matrix table ───────────────────────────────────────────────
    header = "| True \\ Predicted | " + " | ".join(cm_labels) + " |"
    separator = "|---|" + "---|" * len(cm_labels)
    cm_rows = []
    for i, row in enumerate(cm):
        row_str = f"| **{cm_labels[i]}** | " + " | ".join(str(v) for v in row) + " |"
        cm_rows.append(row_str)
    cm_table = "\n".join([header, separator] + cm_rows)

    # ── Feature importance table (top 15) ────────────────────────────────────
    fi_header = "| Rank | Feature | Importance |"
    fi_sep = "|---|---|---|"
    fi_rows = [
        f"| {f['rank']} | `{f['feature']}` | {f['importance']:.6f} |"
        for f in feat_imp[:15]
    ]
    fi_table = "\n".join([fi_header, fi_sep] + fi_rows)

    # ── CSV file list ────────────────────────────────────────────────────────
    csv_list = "\n".join(f"- `{f}`" for f in csv_files_used)

    report = f"""# AURA Risk Prediction Model — Training Report

**Generated**: {now}

---

## 1. Dataset

| Property | Value |
|---|---|
| Total samples (merged & shuffled) | {n_total_samples:,} |
| CSV files loaded | {len(csv_files_used)} |
| Target column | `risk_label` (derived from `spd_level`) |
| Split ratio | Train {int(TRAIN_RATIO*100)}% / Val {int(VAL_RATIO*100)}% / Test {int(TEST_RATIO*100)}% |
| Test samples | {metrics['test_samples']:,} |

### CSV Files Used

{csv_list}

### Risk Label Mapping

| `spd_level` | `risk_label` (integer) | Class Name |
|---|---|---|
| Mild | 0 | LOW |
| Moderate | 1 | MEDIUM |
| Severe | 2 | HIGH |

---

## 2. Feature Engineering

**Engineered features** added before preprocessing:

| Feature | Description |
|---|---|
| `noise_heart_interaction` | `noise_db × heart_rate / 10 000` — compound sensory load |
| `thermal_stress` | `|body_temp − ambient_temp|` — thermoregulation effort |
| `spo2_deficit` | `max(0, 100 − blood_oxygen)` — SpO2 deviation from ideal |
| `hr_age_ratio` | `heart_rate / (age + 1)` — age-normalised heart rate |
| `humidity_comfort_delta` | `|humidity − 50|` — deviation from WHO comfort midpoint |

Total feature count after one-hot encoding: **{len(feature_names)}**

---

## 3. Preprocessing

- **Numeric columns**: Median imputation → Standard scaling
- **Categorical columns**: Mode imputation → One-hot encoding (`handle_unknown="ignore"`)
- Preprocessor bundled **with** the model artifact for inference consistency

---

## 4. Hyperparameter Tuning

| Property | Value |
|---|---|
| Search strategy | {tuning_meta['search_type']} |
| CV folds | {tuning_meta['cv_folds']} |
| Scoring metric | `{tuning_meta['scoring_metric']}` |
| Candidates evaluated | {tuning_meta['n_candidates_evaluated']} |
| Best CV score | {tuning_meta['best_cv_score']:.4f} |
| Validation F1 (weighted) | {tuning_meta['val_f1_weighted']:.4f} |
| Wall-clock time | {tuning_meta['wall_time_seconds']:.1f} s |

### Best Hyperparameters

```json
{json.dumps(tuning_meta['best_params'], indent=2)}
```

---

## 5. Test Set Evaluation

| Metric | Value |
|---|---|
| **Accuracy** | **{metrics['accuracy']:.4f}** |
| Precision (macro) | {metrics['precision_macro']:.4f} |
| Precision (weighted) | {metrics['precision_weighted']:.4f} |
| Recall (macro) | {metrics['recall_macro']:.4f} |
| Recall (weighted) | {metrics['recall_weighted']:.4f} |
| F1 Score (macro) | {metrics['f1_macro']:.4f} |
| **F1 Score (weighted)** | **{metrics['f1_weighted']:.4f}** |
| ROC AUC (weighted OvR) | {metrics['roc_auc_weighted'] if metrics['roc_auc_weighted'] is not None else 'N/A'} |

### Confusion Matrix

{cm_table}

### Per-Class Classification Report

```
{metrics['classification_report']}
```

---

## 6. Feature Importance (Top 15)

{fi_table}

---

## 7. Saved Artefacts

| File | Description |
|---|---|
| `models/risk_model.joblib` | Bundled model + preprocessor |
| `models/risk_metrics.json` | Full metrics payload |
| `models/risk_feature_names.json` | Ordered feature names (for inference) |
| `reports/risk_training_report.md` | This report |

---

*AURA Risk Prediction Pipeline — Capgemini T4PF*
"""

    REPORT_PATH.write_text(report, encoding="utf-8")
    logger.info("Training report saved → %s", REPORT_PATH)
