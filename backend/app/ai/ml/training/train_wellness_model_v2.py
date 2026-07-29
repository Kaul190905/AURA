#!/usr/bin/env python
"""
train_wellness_model_v2.py
==========================
AURA Holistic Wellness Model — Complete Training Pipeline
Capgemini T4PF

This script orchestrates all wellness pipeline stages in order:
  Stage 1 : Data Discovery & Loading
  Stage 2 : Validation
  Stage 3 : Feature Engineering
  Stage 4 : Preprocessing (fit + transform)
  Stage 5 : Three-way Split (70 / 15 / 15)
  Stage 6 : Hyper-parameter Tuning (GradientBoostingRegressor)
  Stage 7 : Test Set Evaluation
  Stage 8 : Artefact Persistence
"""

from __future__ import annotations

import logging
import sys
import time
from pathlib import Path

# Make sure repository root is importable
_HERE = Path(__file__).resolve().parent
_BACKEND = _HERE.parents[3]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.ai.ml.training.wellness import (
    add_features,
    drop_duplicates_and_shuffle,
    evaluate,
    load_and_merge,
    WellnessPreprocessor,
    save_all,
    split_dataset,
    tune_and_train,
    validate_dataset,
    DATA_DIR,
)
from app.ai.ml.training.wellness.config import CSV_PATTERN

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)-8s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("aura.wellness_training")


def stage(number: int, name: str) -> None:
    logger.info("")
    logger.info("-" * 60)
    logger.info("  STAGE %d: %s", number, name)
    logger.info("-" * 60)


def run_pipeline() -> None:
    wall_start = time.perf_counter()

    # ── Stage 1: Data Discovery & Loading ──
    stage(1, "Data Discovery & Loading")
    df = load_and_merge()
    csv_files_used = sorted(p.name for p in DATA_DIR.glob(CSV_PATTERN))

    # ── Stage 2: Validation ──
    stage(2, "Dataset Validation")
    validate_dataset(df)
    
    # ── Stage 3: Feature Engineering ──
    stage(3, "Feature Engineering (Wellness & Daily Baselines)")
    df = add_features(df)
    df = drop_duplicates_and_shuffle(df)
    n_total_samples = len(df)

    # ── Stage 4: Preprocessing ──
    stage(4, "Preprocessing (fit + transform)")
    preprocessor = WellnessPreprocessor()
    X, y = preprocessor.fit_transform(df)

    # ── Stage 5: Three-way Split ──
    stage(5, "Three-way Split (70 / 15 / 15)")
    X_train, y_train, X_val, y_val, X_test, y_test = split_dataset(X, y)

    # ── Stage 6: Hyper-parameter Tuning & Training ──
    stage(6, "Hyper-parameter Tuning (GradientBoostingRegressor)")
    best_model, tuning_meta = tune_and_train(X_train, y_train, X_val, y_val)

    # ── Stage 7: Test Set Evaluation ──
    stage(7, "Test Set Evaluation")
    metrics = evaluate(best_model, X_test, y_test, preprocessor.feature_names_out)

    # ── Stage 8: Artefact Persistence ──
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
    logger.info("  MAE  : %.4f", metrics["mae"])
    logger.info("  RMSE : %.4f", metrics["rmse"])
    logger.info("  R²   : %.4f", metrics["r2"])
    logger.info("=" * 60)
    logger.info("")


if __name__ == "__main__":
    run_pipeline()
