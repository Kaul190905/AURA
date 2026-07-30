#!/usr/bin/env python
"""
train_risk_model_v2.py
======================
AURA Risk Prediction Model — Complete Training Pipeline
Capgemini T4PF

This script is the single entry-point for the production training pipeline.
It orchestrates all pipeline stages in order:

  Stage 1 : Data Discovery & Loading
  Stage 2 : Validation
  Stage 3 : Feature Engineering
  Stage 4 : Preprocessing (fit + transform)
  Stage 5 : Three-way Split (70 / 15 / 15)
  Stage 6 : Hyper-parameter Tuning (GridSearchCV / RandomizedSearchCV)
  Stage 7 : Test Set Evaluation
  Stage 8 : Artefact Persistence

Usage
-----
From the project root (AURA/):

    # Option A — run as a module (recommended, keeps imports clean)
    python -m backend.app.ai.ml.training.train_risk_model_v2

    # Option B — run the script directly (must set PYTHONPATH)
    cd backend
    python app/ai/ml/training/train_risk_model_v2.py

    # Option C — from the backend directory
    cd backend
    python -m app.ai.ml.training.train_risk_model_v2

Outputs
-------
    models/risk_model.joblib           — model + preprocessor bundle
    models/risk_metrics.json           — full metrics JSON
    models/risk_feature_names.json     — ordered feature names
    reports/risk_training_report.md    — human-readable markdown report

NOTE:
  This script does NOT overwrite the legacy artifact at
  ``backend/app/ai/ml/artifacts/risk_model.joblib`` used by the existing
  MLRiskEngine. The new artefacts go to ``models/`` at the project root.
"""

from __future__ import annotations

import logging
import sys
import time
from pathlib import Path

# ── Make sure the project root is importable when run as a plain script ──────
_HERE = Path(__file__).resolve().parent                       # …/training/
_BACKEND = _HERE.parents[3]                                   # …/backend/
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

# ── Internal imports (all from the risk sub-package) ────────────────────────
from app.ai.ml.training.risk import (   # noqa: E402
    add_features,
    drop_duplicates,
    evaluate,
    load_and_merge,
    RiskPreprocessor,
    save_all,
    three_way_split,
    tune_and_train,
    validate_dataset,
    DATA_DIR,
)
from app.ai.ml.training.risk.config import (   # noqa: E402
    CSV_PATTERN,
)

# ── Logging setup ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)-8s]  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("aura.risk_training")


# ---------------------------------------------------------------------------
# Pipeline Stages
# ---------------------------------------------------------------------------

def stage(number: int, name: str) -> None:
    """Log a stage banner."""
    logger.info("")
    logger.info("-" * 60)
    logger.info("  STAGE %d: %s", number, name)
    logger.info("-" * 60)


def run_pipeline() -> None:
    wall_start = time.perf_counter()

    # ── Stage 1: Data Discovery & Loading ────────────────────────────────────
    stage(1, "Data Discovery & Loading")
    df = load_and_merge()
    csv_files_used = sorted(p.name for p in DATA_DIR.glob(CSV_PATTERN))

    # ── Stage 2: Validation ───────────────────────────────────────────────────
    stage(2, "Dataset Validation")
    validate_dataset(df)
    df = drop_duplicates(df)

    n_total_samples = len(df)
    logger.info("Total samples after deduplication: %d", n_total_samples)

    # ── Stage 3: Feature Engineering ─────────────────────────────────────────
    stage(3, "Feature Engineering")
    df = add_features(df)

    # ── Stage 4: Preprocessing ────────────────────────────────────────────────
    stage(4, "Preprocessing (fit + transform)")
    preprocessor = RiskPreprocessor()
    X, y = preprocessor.fit_transform(df)
    logger.info(
        "Feature matrix shape: %s | Unique classes: %s",
        X.shape,
        sorted(set(y.tolist())),
    )

    # ── Stage 5: Three-way Split ──────────────────────────────────────────────
    stage(5, "Three-way Split (70 / 15 / 15)")
    X_train, y_train, X_val, y_val, X_test, y_test = three_way_split(X, y)

    # ── Stage 6: Hyper-parameter Tuning & Training ───────────────────────────
    stage(6, "Hyper-parameter Tuning (GradientBoostingClassifier)")
    best_model, tuning_meta = tune_and_train(X_train, y_train, X_val, y_val)

    # ── Stage 7: Test Set Evaluation ─────────────────────────────────────────
    stage(7, "Test Set Evaluation")
    metrics = evaluate(best_model, X_test, y_test, preprocessor.feature_names_out)

    # ── Stage 8: Artefact Persistence ────────────────────────────────────────
    stage(8, "Saving Artefacts")
    save_all(
        model=best_model,
        preprocessor=preprocessor,
        metrics=metrics,
        tuning_meta=tuning_meta,
        n_total_samples=n_total_samples,
        csv_files_used=csv_files_used,
    )

    total_time = round(time.perf_counter() - wall_start, 1)
    logger.info("")
    logger.info("=" * 60)
    logger.info("  PIPELINE COMPLETE in %.1f s", total_time)
    logger.info("  Accuracy    : %.4f", metrics["accuracy"])
    logger.info("  F1 weighted : %.4f", metrics["f1_weighted"])
    logger.info("  ROC AUC     : %s", str(metrics["roc_auc_weighted"]))
    logger.info("=" * 60)
    logger.info("")


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    run_pipeline()
