import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.ai.ml.pattern_engine_ml import MLPatternEngine
from app.ai.ml.features import build_feature_matrix


# ---- features.build_feature_matrix ----

def test_build_feature_matrix_imputes_missing_with_column_mean():
    records = [
        {"heart_rate": 70, "noise": 50},
        {"heart_rate": None, "noise": 60},
        {"heart_rate": 90, "noise": None},
    ]
    matrix = build_feature_matrix(records, feature_keys=["heart_rate", "noise"])

    assert matrix.shape == (3, 2)
    assert matrix[1, 0] == pytest.approx(80.0)  # mean of 70, 90
    assert matrix[2, 1] == pytest.approx(55.0)  # mean of 50, 60


def test_build_feature_matrix_all_missing_column_defaults_to_zero():
    records = [{"heart_rate": None}, {"heart_rate": None}]
    matrix = build_feature_matrix(records, feature_keys=["heart_rate"])
    assert (matrix == 0.0).all()


def test_build_feature_matrix_empty_records():
    matrix = build_feature_matrix([], feature_keys=["heart_rate", "noise"])
    assert matrix.shape == (0, 2)


# ---- MLPatternEngine.detect_anomalies ----

@pytest.fixture
def engine():
    return MLPatternEngine(min_samples_for_model=20)


@pytest.mark.asyncio
async def test_detect_anomalies_empty_input_returns_empty_list(engine):
    result = await engine.detect_anomalies(uuid4(), [])
    assert result == []


@pytest.mark.asyncio
async def test_detect_anomalies_uses_zscore_fallback_below_min_samples(engine):
    telemetry = [
        {"heart_rate": 70 + i, "blood_oxygen": 97, "temperature": 22, "noise": 50}
        for i in range(5)
    ]
    result = await engine.detect_anomalies(uuid4(), telemetry)

    assert len(result) == 5
    assert all(r["method"] == "zscore_fallback" for r in result)
    assert all(isinstance(r["is_anomaly"], bool) for r in result)


@pytest.mark.asyncio
async def test_detect_anomalies_zscore_flags_obvious_outlier(engine):
    telemetry = [
        {"heart_rate": 70, "blood_oxygen": 97, "temperature": 22, "noise": 50}
        for _ in range(9)
    ]
    telemetry.append({"heart_rate": 400, "blood_oxygen": 97, "temperature": 22, "noise": 50})

    result = await engine.detect_anomalies(uuid4(), telemetry)

    assert result[-1]["is_anomaly"] is True
    assert all(not r["is_anomaly"] for r in result[:-1])


@pytest.mark.asyncio
async def test_detect_anomalies_uses_isolation_forest_at_or_above_min_samples(engine):
    telemetry = [
        {"heart_rate": 70 + (i % 3), "blood_oxygen": 97, "temperature": 22, "noise": 50}
        for i in range(25)
    ]
    telemetry.append({"heart_rate": 350, "blood_oxygen": 60, "temperature": 40, "noise": 150})

    result = await engine.detect_anomalies(uuid4(), telemetry)

    assert len(result) == 26
    assert all(r["method"] == "isolation_forest" for r in result)
    assert result[-1]["is_anomaly"] is True


@pytest.mark.asyncio
async def test_detect_anomalies_preserves_input_order_and_records(engine):
    telemetry = [
        {"heart_rate": 70, "blood_oxygen": 97, "temperature": 22, "noise": 50},
        {"heart_rate": 72, "blood_oxygen": 96, "temperature": 21, "noise": 55},
    ]
    result = await engine.detect_anomalies(uuid4(), telemetry)

    assert result[0]["index"] == 0
    assert result[0]["record"] == telemetry[0]
    assert result[1]["index"] == 1
    assert result[1]["record"] == telemetry[1]


# ---- MLPatternEngine.extract_behavioral_patterns ----

def _make_sensor_row(heart_rate, noise, temperature, hour, blood_oxygen=97.0):
    row = MagicMock()
    row.heart_rate = heart_rate
    row.blood_oxygen = blood_oxygen
    row.temperature = temperature
    row.noise = noise
    row.timestamp = datetime(2026, 1, 1, hour, 0, tzinfo=timezone.utc)
    return row


@pytest.mark.asyncio
async def test_extract_behavioral_patterns_requires_repo():
    engine = MLPatternEngine(sensor_data_repo=None)
    with pytest.raises(RuntimeError):
        await engine.extract_behavioral_patterns(uuid4())


@pytest.mark.asyncio
async def test_extract_behavioral_patterns_insufficient_data_returns_status():
    repo = AsyncMock()
    repo.get_history.return_value = [_make_sensor_row(70, 50, 22, 10) for _ in range(5)]
    engine = MLPatternEngine(sensor_data_repo=repo, min_samples_for_model=20)

    result = await engine.extract_behavioral_patterns(uuid4())

    assert result["status"] == "insufficient_data"
    assert result["samples_collected"] == 5
    assert result["samples_required"] == 20


@pytest.mark.asyncio
async def test_extract_behavioral_patterns_clusters_rest_and_active_periods():
    repo = AsyncMock()
    # Night-time / low-metric "rest" readings.
    rest_rows = [_make_sensor_row(60, 30, 20, hour=2) for _ in range(15)]
    # Daytime / high heart-rate "active" readings.
    active_rows = [_make_sensor_row(140, 80, 24, hour=14) for _ in range(15)]
    repo.get_history.return_value = rest_rows + active_rows

    engine = MLPatternEngine(sensor_data_repo=repo, min_samples_for_model=20, n_clusters=2)
    result = await engine.extract_behavioral_patterns(uuid4())

    assert result["status"] == "ok"
    assert result["samples_analyzed"] == 30
    assert len(result["clusters"]) == 2
    labels = {c["label"] for c in result["clusters"]}
    assert "elevated-activity" in labels or "rest-period" in labels
    assert result["dominant_pattern"] is not None
    total_share = sum(c["share"] for c in result["clusters"])
    assert total_share == pytest.approx(1.0, abs=0.01)


@pytest.mark.asyncio
async def test_extract_behavioral_patterns_caps_clusters_to_sample_count():
    repo = AsyncMock()
    repo.get_history.return_value = [_make_sensor_row(70, 50, 22, 10) for _ in range(20)]
    engine = MLPatternEngine(sensor_data_repo=repo, min_samples_for_model=5, n_clusters=10)

    result = await engine.extract_behavioral_patterns(uuid4())

    assert result["status"] == "ok"
    assert len(result["clusters"]) <= 20
