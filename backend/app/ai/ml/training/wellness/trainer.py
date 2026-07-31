"""
wellness/trainer.py
-------------------
Two-phase Gradient Boosting Regressor training with hyperparameter search.
Phase 1: Fast CV search on a stratified/random subsample (20k rows, n_estimators=50).
Phase 2: Refit best estimator on REFIT_SUBSAMPLE_SIZE (150k rows, n_estimators=150).
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Tuple

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV

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

MAX_GRID_FITS = 100


def _count_grid_fits(param_grid: Dict[str, list]) -> int:
    total = 1
    for values in param_grid.values():
        total *= len(values)
    return total * CV_FOLDS


def _subsample(X: np.ndarray, y: np.ndarray, n: int) -> Tuple[np.ndarray, np.ndarray]:
    if len(y) <= n:
        return X, y
    rng = np.random.default_rng(RANDOM_STATE)
    idx = rng.choice(len(y), size=n, replace=False)
    logger.info("Subsampled %d / %d rows for training step.", n, len(y))
    return X[idx], y[idx]


def tune_and_train(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
) -> Tuple[GradientBoostingRegressor, Dict[str, Any]]:
    """
    Tune hyperparameters using GridSearchCV or RandomizedSearchCV,
    then refit on refit subset using optimal hyperparameters.
    """
    # ── Phase 1: Fast CV Search on 20k rows ──
    X_cv, y_cv = _subsample(X_train, y_train, CV_SUBSAMPLE_SIZE)

    search_base = GradientBoostingRegressor(
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
            "Phase 1: RandomizedSearchCV | %d iterations | n_estimators=%d | subsample=%d rows.",
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
        search_elapsed, SCORING_METRIC, best_cv_score, best_params
    )

    # ── Phase 2: Refit on REFIT_SUBSAMPLE_SIZE using best parameters ──
    final_params = {**best_params, "n_estimators": FINAL_N_ESTIMATORS}
    
    if len(y_train) > REFIT_SUBSAMPLE_SIZE:
        X_refit, y_refit = _subsample(X_train, y_train, REFIT_SUBSAMPLE_SIZE)
    else:
        X_refit, y_refit = X_train, y_train

    logger.info(
        "Phase 2: Refitting on training subset (%d rows) | n_estimators=%d ...",
        len(y_refit), FINAL_N_ESTIMATORS
    )
    t1 = time.perf_counter()
    best_model = GradientBoostingRegressor(random_state=RANDOM_STATE, **final_params)
    best_model.fit(X_refit, y_refit)
    refit_elapsed = round(time.perf_counter() - t1, 2)
    
    logger.info("Phase 2 done in %.1f s.", refit_elapsed)

    total_elapsed = round(search_elapsed + refit_elapsed, 2)

    # ── Validation metrics check ──
    from sklearn.metrics import mean_absolute_error
    val_preds = best_model.predict(X_val)
    val_mae = round(float(mean_absolute_error(y_val, val_preds)), 4)
    logger.info("Validation MAE: %.4f", val_mae)

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
        "val_mae": val_mae,
        "wall_time_seconds": total_elapsed,
    }

    return best_model, tuning_meta
