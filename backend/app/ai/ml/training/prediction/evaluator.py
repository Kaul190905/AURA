"""
prediction/evaluator.py
-----------------------
Computes regression metrics for the AURA Overload Prediction model on the test split:
- MAE (Mean Absolute Error)
- RMSE (Root Mean Squared Error)
- R² Score
- Feature Importance (top-N)
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

logger = logging.getLogger(__name__)

TOP_N_FEATURES = 20


def evaluate(
    model: GradientBoostingRegressor,
    X_test: np.ndarray,
    y_test: np.ndarray,
    feature_names: List[str],
) -> Dict[str, Any]:
    """
    Evaluate the prediction model on the test split and return a metrics dict.
    """
    y_pred = model.predict(X_test)

    # Calculate metrics
    mae = round(float(mean_absolute_error(y_test, y_pred)), 4)
    rmse = round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4)
    r2 = round(float(r2_score(y_test, y_pred)), 4)

    # Feature Importance
    importances: np.ndarray = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    top_features = [
        {
            "rank": int(rank + 1),
            "feature": str(feature_names[idx]),
            "importance": round(float(importances[idx]), 6),
        }
        for rank, idx in enumerate(sorted_idx[:TOP_N_FEATURES])
    ]

    logger.info("=" * 60)
    logger.info("TEST SET EVALUATION (REGRESSION)")
    logger.info("  MAE  : %.4f", mae)
    logger.info("  RMSE : %.4f", rmse)
    logger.info("  R²   : %.4f", r2)
    logger.info("Top-%d Features:", TOP_N_FEATURES)
    for feat in top_features[:5]:
        logger.info("  #%d  %-35s %.6f", feat["rank"], feat["feature"], feat["importance"])
    logger.info("=" * 60)

    return {
        "test_samples": int(len(y_test)),
        "mae": mae,
        "rmse": rmse,
        "r2": r2,
        "feature_importance": top_features,
    }
