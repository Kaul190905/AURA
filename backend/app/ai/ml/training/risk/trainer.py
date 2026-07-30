"""
risk/trainer.py
---------------
Two-phase Gradient Boosting Classifier training.

Phase 1 — CV SEARCH (fast, ~2 minutes)
    GridSearchCV runs on a stratified 20k-row subsample with n_estimators=50.
    Only max_depth, learning_rate, and subsample are tuned — these are the
    dominant GBC hyperparameters and converge quickly even with 50 trees.

Phase 2 — FULL REFIT (production quality, ~3-5 minutes)
    The best params from Phase 1 are used to build a fresh
    GradientBoostingClassifier(n_estimators=FINAL_N_ESTIMATORS) and fitted on
    100% of the training split.

Why not tune n_estimators in CV?
    GBC is inherently sequential — each tree is built on the residuals of the
    previous one, so n_jobs has no effect on the estimator itself (only on the
    CV loop). Tuning n_estimators in CV multiplies runtime by that factor.
    The standard MLOps solution is to fix a small n_estimators for search and
    use a larger value for the final production model.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Tuple

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, StratifiedShuffleSplit

from .config import (
    CV_FOLDS,
    CV_SUBSAMPLE_SIZE,
    FINAL_N_ESTIMATORS,
    N_ITER_RANDOM,
    N_JOBS,
    RANDOM_STATE,
    REFIT_SUBSAMPLE_SIZE,
    SCORING_METRIC,
    SEARCH_N_ESTIMATORS,
    SEARCH_PARAM_GRID,
)

logger = logging.getLogger(__name__)

# Switch to RandomizedSearchCV if grid exceeds this many total fits
MAX_GRID_FITS = 100


def _count_grid_fits(param_grid: Dict[str, list]) -> int:
    total = 1
    for values in param_grid.values():
        total *= len(values)
    return total * CV_FOLDS


def _subsample_for_cv(X: np.ndarray, y: np.ndarray, n: int) -> Tuple[np.ndarray, np.ndarray]:
    """Return a stratified subsample of at most *n* rows for fast CV search."""
    if len(y) <= n:
        return X, y
    sss = StratifiedShuffleSplit(n_splits=1, train_size=n, random_state=RANDOM_STATE)
    idx, _ = next(sss.split(X, y))
    logger.info("CV subsample: %d / %d training rows selected (stratified).", n, len(y))
    return X[idx], y[idx]


def tune_and_train(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
) -> Tuple[GradientBoostingClassifier, Dict[str, Any]]:
    """
    Two-phase training: fast CV search on a subsample, then full refit.

    Returns
    -------
    best_model  : GradientBoostingClassifier with FINAL_N_ESTIMATORS, fitted
                  on the entire training split.
    tuning_meta : JSON-serialisable metadata dict.
    """
    # ── Phase 1: Subsample + fast CV search (n_estimators=SEARCH_N_ESTIMATORS) ──
    X_cv, y_cv = _subsample_for_cv(X_train, y_train, CV_SUBSAMPLE_SIZE)

    # Attach fixed low n_estimators to each candidate in the search
    search_base = GradientBoostingClassifier(
        n_estimators=SEARCH_N_ESTIMATORS,
        random_state=RANDOM_STATE,
    )

    n_fits = _count_grid_fits(SEARCH_PARAM_GRID)
    search_type: str

    if n_fits <= MAX_GRID_FITS:
        search_type = "GridSearchCV"
        logger.info(
            "Phase 1: GridSearchCV | %d fits (%d folds x %d candidates) "
            "| n_estimators=%d | subsample=%d rows.",
            n_fits, CV_FOLDS, n_fits // CV_FOLDS,
            SEARCH_N_ESTIMATORS, len(y_cv),
        )
        searcher: Any = GridSearchCV(
            estimator=search_base,
            param_grid=SEARCH_PARAM_GRID,
            cv=CV_FOLDS,
            scoring=SCORING_METRIC,
            n_jobs=N_JOBS,
            refit=False,
            verbose=1,
        )
    else:
        search_type = "RandomizedSearchCV"
        logger.info(
            "Phase 1: RandomizedSearchCV | %d iters | n_estimators=%d | subsample=%d rows.",
            N_ITER_RANDOM, SEARCH_N_ESTIMATORS, len(y_cv),
        )
        searcher = RandomizedSearchCV(
            estimator=search_base,
            param_distributions=SEARCH_PARAM_GRID,
            n_iter=N_ITER_RANDOM,
            cv=CV_FOLDS,
            scoring=SCORING_METRIC,
            n_jobs=N_JOBS,
            refit=False,
            random_state=RANDOM_STATE,
            verbose=1,
        )

    t0 = time.perf_counter()
    searcher.fit(X_cv, y_cv)
    search_elapsed = round(time.perf_counter() - t0, 2)

    best_params: Dict[str, Any] = searcher.best_params_
    best_cv_score = round(float(searcher.best_score_), 4)
    logger.info(
        "Phase 1 done in %.1f s | Best CV %s: %.4f | Params: %s",
        search_elapsed, SCORING_METRIC, best_cv_score, best_params,
    )

    # ── Phase 2: Refit with FINAL_N_ESTIMATORS on (possibly subsampled) training data ──────
    final_params = {**best_params, "n_estimators": FINAL_N_ESTIMATORS}
    
    # Subsample training data for refit if it exceeds REFIT_SUBSAMPLE_SIZE
    if len(y_train) > REFIT_SUBSAMPLE_SIZE:
        logger.info("Subsampling training set for final refit using REFIT_SUBSAMPLE_SIZE = %d ...", REFIT_SUBSAMPLE_SIZE)
        # Reuse _subsample_for_cv logic
        X_refit, y_refit = _subsample_for_cv(X_train, y_train, REFIT_SUBSAMPLE_SIZE)
    else:
        X_refit, y_refit = X_train, y_train

    logger.info(
        "Phase 2: Refitting on training set (%d rows) | n_estimators=%d ...",
        len(y_refit), FINAL_N_ESTIMATORS,
    )
    t1 = time.perf_counter()
    best_model = GradientBoostingClassifier(random_state=RANDOM_STATE, **final_params)
    best_model.fit(X_refit, y_refit)
    refit_elapsed = round(time.perf_counter() - t1, 2)
    logger.info("Phase 2 done in %.1f s.", refit_elapsed)

    total_elapsed = round(search_elapsed + refit_elapsed, 2)

    # ── Validation sanity-check ───────────────────────────────────────────────
    from sklearn.metrics import f1_score
    val_preds = best_model.predict(X_val)
    val_f1 = round(float(f1_score(y_val, val_preds, average="weighted")), 4)
    logger.info("Validation F1 (weighted): %.4f", val_f1)

    n_candidates = len(searcher.cv_results_["params"]) if hasattr(searcher, "cv_results_") else N_ITER_RANDOM

    tuning_meta: Dict[str, Any] = {
        "search_type": search_type,
        "search_n_estimators": SEARCH_N_ESTIMATORS,
        "final_n_estimators": FINAL_N_ESTIMATORS,
        "cv_subsample_size": len(y_cv),
        "full_train_size": len(y_train),
        "refit_size": len(y_refit),
        "best_search_params": best_params,
        "best_params": final_params,
        "best_cv_score": best_cv_score,
        "cv_folds": CV_FOLDS,
        "scoring_metric": SCORING_METRIC,
        "n_candidates_evaluated": n_candidates,
        "val_f1_weighted": val_f1,
        "wall_time_seconds": total_elapsed,
    }

    return best_model, tuning_meta
