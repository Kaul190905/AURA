"""
prediction/preprocessor.py
--------------------------
Stateful preprocessor for AURA Prediction model.
Reuses the exact preprocessing pipeline design from the Risk Model:
- Numeric features: Median imputation + StandardScaler
- Categorical features: Mode imputation + OneHotEncoder (handle_unknown="ignore")
"""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .config import (
    CATEGORICAL_COLS,
    DROP_COLS,
    NUMERIC_COLS,
    TARGET_COL,
)

logger = logging.getLogger(__name__)


class PredictionPreprocessor:
    """
    Reusable preprocessor for the overload prediction model.
    """

    def __init__(self) -> None:
        self._column_transformer: Optional[ColumnTransformer] = None
        self.feature_names_out: List[str] = []
        self.is_fitted: bool = False

    def fit_transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Fit preprocessor on training dataframe and return transformed matrices.
        """
        df = self._sanitise(df)
        X_raw, y = self._split_xy(df)

        self._build_column_transformer()
        X = self._column_transformer.fit_transform(X_raw)
        self.feature_names_out = self._get_feature_names()
        self.is_fitted = True

        logger.info("Preprocessor fitted. X shape: %s", X.shape)
        return X, y

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """
        Transform raw dataframe using the fitted preprocessor.
        """
        if not self.is_fitted:
            raise RuntimeError("Preprocessor has not been fitted.")
        df = self._sanitise(df, training=False)
        X_raw = df[[c for c in NUMERIC_COLS + CATEGORICAL_COLS if c in df.columns]]
        return self._column_transformer.transform(X_raw)

    def _sanitise(self, df: pd.DataFrame, training: bool = True) -> pd.DataFrame:
        cols_to_drop = [c for c in DROP_COLS if c in df.columns]
        df = df.drop(columns=cols_to_drop)

        if training and TARGET_COL not in df.columns:
            raise ValueError(f"Target column {TARGET_COL} not found.")

        for col in NUMERIC_COLS:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        for col in CATEGORICAL_COLS:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()

        return df

    def _split_xy(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, np.ndarray]:
        y = df[TARGET_COL].values.astype(float)
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
        names: List[str] = list(NUMERIC_COLS)
        ohe: OneHotEncoder = (
            self._column_transformer
            .named_transformers_["cat"]
            .named_steps["onehot"]
        )
        names.extend(ohe.get_feature_names_out(CATEGORICAL_COLS).tolist())
        return names
