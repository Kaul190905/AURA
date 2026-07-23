import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.ai.ml.features import DEFAULT_FEATURE_KEYS, build_feature_matrix
from app.ai.pattern_engine import IPatternEngine
from app.repositories.sensor_data_repository import SensorDataRepository

logger = logging.getLogger(__name__)

ANOMALY_ZSCORE_THRESHOLD = 2.5


class MLPatternEngine(IPatternEngine):
    """
    Unsupervised, per-request pattern engine (no persisted model artifact —
    models are fit fresh on each call against the given/fetched data window).

    detect_anomalies: fits an IsolationForest on the supplied telemetry window
    and flags in-sample outliers. Falls back to a per-feature z-score check
    when there isn't enough data to train a model reliably.

    extract_behavioral_patterns: clusters a user's recent sensor history
    (metric levels + time-of-day) with KMeans to surface recurring
    behavioral states (e.g. rest periods, elevated-activity windows).
    """

    def __init__(
        self,
        sensor_data_repo: Optional[SensorDataRepository] = None,
        feature_keys: Optional[List[str]] = None,
        contamination: float = 0.1,
        min_samples_for_model: int = 20,
        history_limit: int = 200,
        n_clusters: int = 3,
        random_state: int = 42,
    ):
        self.sensor_data_repo = sensor_data_repo
        self.feature_keys = feature_keys or DEFAULT_FEATURE_KEYS
        self.contamination = contamination
        self.min_samples_for_model = min_samples_for_model
        self.history_limit = history_limit
        self.n_clusters = n_clusters
        self.random_state = random_state

    async def detect_anomalies(
        self, user_id: UUID, telemetry_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        if not telemetry_data:
            return []

        matrix = build_feature_matrix(telemetry_data, self.feature_keys)

        if len(telemetry_data) >= self.min_samples_for_model:
            flags_and_scores = self._detect_with_isolation_forest(matrix)
            method = "isolation_forest"
        else:
            flags_and_scores = self._detect_with_zscore(matrix)
            method = "zscore_fallback"

        return [
            {
                "index": i,
                "record": telemetry_data[i],
                "is_anomaly": bool(is_anomaly),
                "anomaly_score": round(float(score), 4),
                "method": method,
            }
            for i, (is_anomaly, score) in enumerate(flags_and_scores)
        ]

    def _detect_with_isolation_forest(self, matrix: np.ndarray):
        scaled = StandardScaler().fit_transform(matrix)

        model = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            random_state=self.random_state,
        )
        labels = model.fit_predict(scaled)  # -1 = anomaly, 1 = normal
        # decision_function: higher = more normal. Flip sign so higher = more anomalous,
        # matching the semantics of the z-score fallback below.
        scores = -model.decision_function(scaled)

        return list(zip(labels == -1, scores))

    def _detect_with_zscore(self, matrix: np.ndarray):
        mean = matrix.mean(axis=0)
        std = matrix.std(axis=0)
        std[std == 0] = 1.0  # constant column: avoid divide-by-zero, treat as no deviation

        z_scores = np.abs((matrix - mean) / std)
        max_z_per_row = z_scores.max(axis=1)

        return list(zip(max_z_per_row > ANOMALY_ZSCORE_THRESHOLD, max_z_per_row))

    async def extract_behavioral_patterns(self, user_id: UUID) -> Dict[str, Any]:
        if self.sensor_data_repo is None:
            raise RuntimeError(
                "MLPatternEngine.extract_behavioral_patterns requires a sensor_data_repo "
                "to fetch the user's history."
            )

        records = await self.sensor_data_repo.get_history(
            user_id=user_id, skip=0, limit=self.history_limit, sort_by="desc"
        )

        if len(records) < self.min_samples_for_model:
            return {
                "status": "insufficient_data",
                "samples_collected": len(records),
                "samples_required": self.min_samples_for_model,
            }

        cluster_feature_keys = self.feature_keys + ["hour_of_day"]
        telemetry_dicts = [
            {
                "heart_rate": r.heart_rate,
                "blood_oxygen": r.blood_oxygen,
                "temperature": r.temperature,
                "noise": r.noise,
                "hour_of_day": r.timestamp.hour if r.timestamp else None,
            }
            for r in records
        ]
        matrix = build_feature_matrix(telemetry_dicts, cluster_feature_keys)
        scaled = StandardScaler().fit_transform(matrix)

        n_clusters = min(self.n_clusters, len(records))
        model = KMeans(n_clusters=n_clusters, random_state=self.random_state, n_init=10)
        labels = model.fit_predict(scaled)

        hr_idx = cluster_feature_keys.index("heart_rate")
        overall_hr_mean = float(matrix[:, hr_idx].mean())

        clusters = []
        for cluster_id in range(n_clusters):
            mask = labels == cluster_id
            size = int(mask.sum())
            if size == 0:
                continue

            avg_values = {
                key: round(float(matrix[mask, idx].mean()), 2)
                for idx, key in enumerate(cluster_feature_keys)
            }
            clusters.append(
                {
                    "cluster_id": int(cluster_id),
                    "size": size,
                    "share": round(size / len(records), 3),
                    "avg_metrics": avg_values,
                    "label": self._label_cluster(avg_values, overall_hr_mean),
                }
            )

        clusters.sort(key=lambda c: c["size"], reverse=True)

        return {
            "status": "ok",
            "samples_analyzed": len(records),
            "clusters": clusters,
            "dominant_pattern": clusters[0]["label"] if clusters else None,
        }

    @staticmethod
    def _label_cluster(avg_values: Dict[str, float], overall_hr_mean: float) -> str:
        hr = avg_values.get("heart_rate")
        noise = avg_values.get("noise")
        hour = avg_values.get("hour_of_day")

        if hr is not None and hr > overall_hr_mean * 1.15:
            return "elevated-activity"
        if hour is not None and (hour >= 22 or hour <= 5):
            return "rest-period"
        if noise is not None and noise > 70:
            return "high-noise-environment"
        return "baseline"
