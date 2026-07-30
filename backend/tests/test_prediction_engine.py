import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.ai.prediction_engine import RulePredictionEngine


@pytest.fixture
def engine():
    return RulePredictionEngine()


# ---- forecast_overload_event ----

@pytest.mark.asyncio
async def test_empty_trajectory_returns_zero_probability(engine):
    result = await engine.forecast_overload_event(uuid4(), {"risk_scores": []})

    assert result["overload_probability"] == 0.0
    assert result["estimated_minutes_to_event"] is None
    assert result["trend"] == "stable"


@pytest.mark.asyncio
async def test_missing_risk_scores_key_treated_as_empty(engine):
    result = await engine.forecast_overload_event(uuid4(), {})
    assert result["overload_probability"] == 0.0


@pytest.mark.asyncio
async def test_flat_low_trajectory_gives_low_probability(engine):
    trajectory = {"risk_scores": [10.0, 10.0, 10.0, 10.0]}
    result = await engine.forecast_overload_event(uuid4(), trajectory)

    assert result["overload_probability"] < 0.2
    assert result["trend"] == "stable"
    assert result["estimated_minutes_to_event"] is None


@pytest.mark.asyncio
async def test_rising_trajectory_gives_higher_probability_than_flat(engine):
    flat = {"risk_scores": [40.0, 40.0, 40.0, 40.0, 40.0]}
    rising = {"risk_scores": [10.0, 20.0, 30.0, 40.0, 50.0]}

    flat_result = await engine.forecast_overload_event(uuid4(), flat)
    rising_result = await engine.forecast_overload_event(uuid4(), rising)

    assert rising_result["overload_probability"] > flat_result["overload_probability"]
    assert rising_result["trend"] == "increasing"


@pytest.mark.asyncio
async def test_rising_trajectory_below_threshold_produces_eta(engine):
    trajectory = {"risk_scores": [30.0, 35.0, 40.0, 45.0, 50.0]}
    result = await engine.forecast_overload_event(uuid4(), trajectory)

    assert result["estimated_minutes_to_event"] is not None
    assert result["estimated_minutes_to_event"] > 0


@pytest.mark.asyncio
async def test_already_above_threshold_has_no_eta(engine):
    trajectory = {"risk_scores": [70.0, 75.0, 80.0]}
    result = await engine.forecast_overload_event(uuid4(), trajectory)

    assert result["estimated_minutes_to_event"] is None


@pytest.mark.asyncio
async def test_declining_trajectory_gives_decreasing_trend(engine):
    trajectory = {"risk_scores": [80.0, 60.0, 40.0, 20.0]}
    result = await engine.forecast_overload_event(uuid4(), trajectory)

    assert result["trend"] == "decreasing"
    assert result["estimated_minutes_to_event"] is None


@pytest.mark.asyncio
async def test_probability_bounded_0_1(engine):
    extreme = {"risk_scores": [100.0, 100.0, 100.0]}
    result = await engine.forecast_overload_event(uuid4(), extreme)
    assert 0.0 <= result["overload_probability"] <= 1.0


@pytest.mark.asyncio
async def test_none_values_in_trajectory_are_filtered(engine):
    trajectory = {"risk_scores": [None, 20.0, None, 40.0]}
    result = await engine.forecast_overload_event(uuid4(), trajectory)
    assert result["overload_probability"] >= 0.0


# ---- predict_metric_trend ----

def _make_sensor_row(heart_rate):
    row = MagicMock()
    row.heart_rate = heart_rate
    return row


@pytest.mark.asyncio
async def test_predict_metric_trend_without_repo_raises():
    engine = RulePredictionEngine(sensor_data_repo=None)
    with pytest.raises(RuntimeError):
        await engine.predict_metric_trend(uuid4(), "heart_rate", 6)


@pytest.mark.asyncio
async def test_predict_metric_trend_insufficient_data_returns_status():
    repo = AsyncMock()
    repo.get_history.return_value = [_make_sensor_row(70)]
    engine = RulePredictionEngine(sensor_data_repo=repo)

    result = await engine.predict_metric_trend(uuid4(), "heart_rate", 6)

    assert result["status"] == "insufficient_data"
    assert result["samples_collected"] == 1


@pytest.mark.asyncio
async def test_predict_metric_trend_extrapolates_rising_metric():
    repo = AsyncMock()
    # get_history returns desc order; engine reverses to chronological.
    repo.get_history.return_value = list(reversed([_make_sensor_row(60 + i * 2) for i in range(10)]))
    engine = RulePredictionEngine(sensor_data_repo=repo, sample_interval_minutes=5.0)

    result = await engine.predict_metric_trend(uuid4(), "heart_rate", horizon_hours=1)

    assert result["status"] == "ok"
    assert result["trend"] == "increasing"
    assert result["predicted_value"] > result["current_value"]
    assert result["samples_analyzed"] == 10


@pytest.mark.asyncio
async def test_predict_metric_trend_flat_metric_is_stable():
    repo = AsyncMock()
    repo.get_history.return_value = [_make_sensor_row(70) for _ in range(10)]
    engine = RulePredictionEngine(sensor_data_repo=repo)

    result = await engine.predict_metric_trend(uuid4(), "heart_rate", horizon_hours=1)

    assert result["trend"] == "stable"
    assert result["predicted_value"] == result["current_value"]
