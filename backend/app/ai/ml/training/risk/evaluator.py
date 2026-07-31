"""
risk/evaluator.py
-----------------
Computes and returns the full evaluation suite on the *test* split:

  - Accuracy
  - Precision (macro & weighted)
  - Recall    (macro & weighted)
  - F1 Score  (macro & weighted)
  - ROC AUC   (one-vs-rest, weighted)
  - Confusion Matrix
  - Per-class classification report
  - Feature Importance (top-N)

All metrics are returned as a plain Python dict so they can be serialised
to JSON without any special handling.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.preprocessing import label_binarize

from .config import RISK_CLASS_NAMES

logger = logging.getLogger(__name__)

TOP_N_FEATURES = 20   # Number of top features to report


def evaluate(
    model: GradientBoostingClassifier,
    X_test: np.ndarray,
    y_test: np.ndarray,
    feature_names: List[str],
) -> Dict[str, Any]:
    """
    Evaluate *model* on the held-out test set and return a metrics dict.

    Parameters
    ----------
    model         : Fitted GradientBoostingClassifier
    X_test        : Test feature matrix
    y_test        : True integer labels (0 / 1 / 2)
    feature_names : Ordered list of feature names (same order as X columns)

    Returns
    -------
    dict  — JSON-serialisable metrics payload
    """
    y_pred = model.predict(X_test)

    # ── Probability estimates for ROC AUC ────────────────────────────────────
    y_proba: np.ndarray | None = None
    try:
        y_proba = model.predict_proba(X_test)
    except AttributeError:
        logger.warning("Model does not support predict_proba — ROC AUC skipped.")

    # ── Core metrics ─────────────────────────────────────────────────────────
    accuracy = round(float(accuracy_score(y_test, y_pred)), 4)

    precision_macro   = round(float(precision_score(y_test, y_pred, average="macro",    zero_division=0)), 4)
    precision_weighted = round(float(precision_score(y_test, y_pred, average="weighted", zero_division=0)), 4)

    recall_macro   = round(float(recall_score(y_test, y_pred, average="macro",    zero_division=0)), 4)
    recall_weighted = round(float(recall_score(y_test, y_pred, average="weighted", zero_division=0)), 4)

    f1_macro   = round(float(f1_score(y_test, y_pred, average="macro",    zero_division=0)), 4)
    f1_weighted = round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4)

    # ── ROC AUC (one-vs-rest) ────────────────────────────────────────────────
    roc_auc: float | None = None
    if y_proba is not None:
        classes = np.unique(y_test)
        if len(classes) > 2:
            y_bin = label_binarize(y_test, classes=list(range(len(RISK_CLASS_NAMES))))
            roc_auc = round(float(roc_auc_score(y_bin, y_proba, multi_class="ovr", average="weighted")), 4)
        else:
            roc_auc = round(float(roc_auc_score(y_test, y_proba[:, 1])), 4)

    # ── Confusion Matrix ─────────────────────────────────────────────────────
    cm = confusion_matrix(y_test, y_pred, labels=list(range(len(RISK_CLASS_NAMES))))
    cm_list = cm.tolist()

    # ── Per-class report ─────────────────────────────────────────────────────
    report_str = classification_report(
        y_test, y_pred,
        target_names=RISK_CLASS_NAMES,
        zero_division=0,
    )

    # ── Feature Importance ───────────────────────────────────────────────────
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

    # ── Log summary ──────────────────────────────────────────────────────────
    logger.info("=" * 60)
    logger.info("TEST SET EVALUATION")
    logger.info("  Accuracy  : %.4f", accuracy)
    logger.info("  F1 (macro): %.4f  |  F1 (weighted): %.4f", f1_macro, f1_weighted)
    logger.info("  ROC AUC   : %s", f"{roc_auc:.4f}" if roc_auc is not None else "N/A")
    logger.info("Confusion Matrix:\n%s", cm)
    logger.info("Classification Report:\n%s", report_str)
    logger.info("Top-%d Features:", TOP_N_FEATURES)
    for feat in top_features[:5]:
        logger.info("  #%d  %-35s %.6f", feat["rank"], feat["feature"], feat["importance"])
    logger.info("=" * 60)

    return {
        "test_samples": int(len(y_test)),
        "accuracy": accuracy,
        "precision_macro": precision_macro,
        "precision_weighted": precision_weighted,
        "recall_macro": recall_macro,
        "recall_weighted": recall_weighted,
        "f1_macro": f1_macro,
        "f1_weighted": f1_weighted,
        "roc_auc_weighted": roc_auc,
        "confusion_matrix": cm_list,
        "confusion_matrix_labels": RISK_CLASS_NAMES,
        "classification_report": report_str,
        "feature_importance": top_features,
    }
