"""
risk/preprocessor.py
--------------------
Reusable preprocessing pipeline for the AURA Risk-Prediction model.

The **same** ``RiskPreprocessor`` instance (or a re-fitted one from the
saved joblib artifact) must be used at inference time so that encoding and
imputation behave identically to training.

Design
------
* ``RiskPreprocessor.fit_transform(df)``   — used during training
* ``RiskPreprocessor.transform(df)``       — used during inference
* ``RiskPreprocessor.feature_names_out``   — ordered list of feature names
  after transformation (saved to ``risk_feature_names.json``)
"""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler

from .config import (
    CATEGORICAL_COLS,
    DROP_COLS,
    NUMERIC_COLS,
    TARGET_COL,
)

logger = logging.getLogger(__name__)


class RiskPreprocessor:
    """
    Stateful preprocessing pipeline.

    Attributes
    ----------
    feature_names_out : List[str]
        Ordered list of feature columns produced after ``fit_transform``.
        Only available after fitting.
    label_encoder : LabelEncoder
        Fitted on the target column (risk_label integer codes → string labels).
        Only available after fitting.
    is_fitted : bool
    """

    def __init__(self) -> None:
        self._column_transformer: Optional[ColumnTransformer] = None
        self.feature_names_out: List[str] = []
        self.label_encoder: LabelEncoder = LabelEncoder()
        self.is_fitted: bool = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fit_transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Fit on *df* and return ``(X, y)`` as numeric numpy arrays.

        Parameters
        ----------
        df : pd.DataFrame
            Merged, shuffled, validated DataFrame (output of data_loader).

        Returns
        -------
        X : np.ndarray  shape (n_samples, n_features)
        y : np.ndarray  shape (n_samples,)  — integer class labels 0/1/2
        """
        df = self._sanitise(df)
        X_raw, y_raw = self._split_xy(df)

        self._build_column_transformer()
        X = self._column_transformer.fit_transform(X_raw)  # type: ignore[union-attr]
        self.feature_names_out = self._get_feature_names()
        self.label_encoder.fit(y_raw)
        y = self.label_encoder.transform(y_raw)

        self.is_fitted = True
        logger.info(
            "Preprocessor fitted. X shape: %s | Classes: %s",
            X.shape,
            self.label_encoder.classes_,
        )
        return X, y

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """
        Transform *df* using the **fitted** preprocessor.

        Parameters
        ----------
        df : pd.DataFrame
            Raw DataFrame (as received at inference time). May or may not
            contain the target column.

        Returns
        -------
        X : np.ndarray  shape (n_samples, n_features)
        """
        if not self.is_fitted:
            raise RuntimeError(
                "RiskPreprocessor.transform() called before fit_transform(). "
                "Call fit_transform() on training data first."
            )
        df = self._sanitise(df, training=False)
        X_raw = df[[c for c in NUMERIC_COLS + CATEGORICAL_COLS if c in df.columns]]
        return self._column_transformer.transform(X_raw)  # type: ignore[union-attr]

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _sanitise(self, df: pd.DataFrame, training: bool = True) -> pd.DataFrame:
        """Drop irrelevant columns, cast types, and deduplicate."""
        cols_to_drop = [c for c in DROP_COLS if c in df.columns]
        df = df.drop(columns=cols_to_drop)

        if training and TARGET_COL not in df.columns:
            raise ValueError(
                f"Target column '{TARGET_COL}' not found in DataFrame. "
                "Make sure data_loader.load_and_merge() was called first."
            )

        # Ensure numeric columns are numeric (coerce bad values to NaN)
        for col in NUMERIC_COLS:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # Ensure categorical columns are strings
        for col in CATEGORICAL_COLS:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()

        return df

    def _split_xy(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        y = df[TARGET_COL].astype(int)
        feature_cols = [c for c in NUMERIC_COLS + CATEGORICAL_COLS if c in df.columns]
        X = df[feature_cols]
        return X, y

    def _build_column_transformer(self) -> None:
        numeric_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ])

        categorical_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ])

        self._column_transformer = ColumnTransformer(
            transformers=[
                ("num", numeric_pipeline, NUMERIC_COLS),
                ("cat", categorical_pipeline, CATEGORICAL_COLS),
            ],
            remainder="drop",
        )

    def _get_feature_names(self) -> List[str]:
        """Return ordered list of feature names after ColumnTransformer."""
        names: List[str] = list(NUMERIC_COLS)  # numeric features keep their names
        ohe: OneHotEncoder = (
            self._column_transformer  # type: ignore[union-attr]
            .named_transformers_["cat"]
            .named_steps["onehot"]
        )
        names.extend(ohe.get_feature_names_out(CATEGORICAL_COLS).tolist())
        return names
