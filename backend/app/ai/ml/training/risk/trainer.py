"""
risk/trainer.py
---------------
Gradient Boosting Classifier training with GridSearchCV / RandomizedSearchCV
hyper-parameter optimisation.

Training strategy
-----------------
1. Train on the *training* split.
2. Tune hyper-parameters via cross-validated grid search on the *training* split.
3. Refit the best estimator on the full *training* split.
4. Evaluate on the *held-out validation* split to detect over/under-fitting.
5. Final evaluation on the *test* split (used once, in evaluator.py).

The ``GridSearchCV`` search is preferred.  If the grid would require more fits
than ``MAX_GRID_FITS`` (configurable), the trainer automatically falls back to
``RandomizedSearchCV`` to keep training time practical on CI machines.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional, Tuple

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV

from .config import (
    CV_FOLDS,
    N_ITER_RANDOM,
    N_JOBS,
    PARAM_GRID,
    RANDOM_STATE,
    SCORING_METRIC,
)

logger = logging.getLogger(__name__)

# Maximum number of total candidate × fold fits before switching to random search
MAX_GRID_FITS = 200


def _count_grid_fits(param_grid: Dict[str, list]) -> int:
    total = 1
    for values in param_grid.values():
        total *= len(values)
    return total * CV_FOLDS


def tune_and_train(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
) -> Tuple[GradientBoostingClassifier, Dict[str, Any]]:
    """
    Run hyper-parameter search, return the best fitted classifier and a
    dictionary of tuning metadata.

    Parameters
    ----------
    X_train, y_train : training split
    X_val,   y_val   : validation split (used only for logging, not for search)

    Returns
    -------
    best_model  : GradientBoostingClassifier fitted on full training data
    tuning_meta : dict with keys: best_params, best_cv_score, search_type,
                  n_candidates_evaluated, wall_time_seconds
    """
    base_estimator = GradientBoostingClassifier(random_state=RANDOM_STATE)

    n_fits = _count_grid_fits(PARAM_GRID)
    search_type: str

    if n_fits <= MAX_GRID_FITS:
        search_type = "GridSearchCV"
        logger.info(
            "Using GridSearchCV (%d total fits, %d folds × %d candidates).",
            n_fits, CV_FOLDS, n_fits // CV_FOLDS,
        )
        searcher: Any = GridSearchCV(
            estimator=base_estimator,
            param_grid=PARAM_GRID,
            cv=CV_FOLDS,
            scoring=SCORING_METRIC,
            n_jobs=N_JOBS,
            refit=True,
            verbose=1,
        )
    else:
        search_type = "RandomizedSearchCV"
        logger.info(
            "Grid is large (%d fits) — falling back to RandomizedSearchCV "
            "(%d iterations).",
            n_fits, N_ITER_RANDOM,
        )
        searcher = RandomizedSearchCV(
            estimator=base_estimator,
            param_distributions=PARAM_GRID,
            n_iter=N_ITER_RANDOM,
            cv=CV_FOLDS,
            scoring=SCORING_METRIC,
            n_jobs=N_JOBS,
            refit=True,
            random_state=RANDOM_STATE,
            verbose=1,
        )

    t0 = time.perf_counter()
    searcher.fit(X_train, y_train)
    elapsed = round(time.perf_counter() - t0, 2)

    best_model: GradientBoostingClassifier = searcher.best_estimator_
    best_cv_score = round(float(searcher.best_score_), 4)
    best_params = searcher.best_params_

    logger.info("Best CV %s: %.4f", SCORING_METRIC, best_cv_score)
    logger.info("Best hyperparameters: %s", best_params)
    logger.info("Search completed in %.1f s.", elapsed)

    # ── Validation-split performance (sanity check) ──────────────────────────
    from sklearn.metrics import f1_score  # local import to keep trainer self-contained
    val_preds = best_model.predict(X_val)
    val_f1 = round(float(f1_score(y_val, val_preds, average="weighted")), 4)
    logger.info("Validation F1 (weighted): %.4f", val_f1)

    n_candidates = (
        len(searcher.cv_results_["params"])
        if hasattr(searcher, "cv_results_")
        else N_ITER_RANDOM
    )

    tuning_meta: Dict[str, Any] = {
        "search_type": search_type,
        "best_params": best_params,
        "best_cv_score": best_cv_score,
        "cv_folds": CV_FOLDS,
        "scoring_metric": SCORING_METRIC,
        "n_candidates_evaluated": n_candidates,
        "val_f1_weighted": val_f1,
        "wall_time_seconds": elapsed,
    }

    return best_model, tuning_meta
