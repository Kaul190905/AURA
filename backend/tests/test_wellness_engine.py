import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.ai.wellness_engine import RuleWellnessEngine


@pytest.fixture
def engine():
    return RuleWellnessEngine()


# ---- calculate_wellness_score (pure, given a snapshot) ----

@pytest.mark.asyncio
async def test_all_optimal_signals_produce_high_score(engine):
    score = await engine.calculate_wellness_score(
        uuid4(), {"risk_score": 0.0, "anomaly_rate": 0.0, "recent_mood_avg": 100.0}
    )
    assert score == 100


@pytest.mark.asyncio
async def test_all_worst_signals_produce_low_score(engine):
    score = await engine.calculate_wellness_score(
        uuid4(), {"risk_score": 100.0, "anomaly_rate": 1.0, "recent_mood_avg": 0.0}
    )
    assert score == 0


@pytest.mark.asyncio
async def test_missing_mood_avg_defaults_to_neutral(engine):
    score = await engine.calculate_wellness_score(
        uuid4(), {"risk_score": 0.0, "anomaly_rate": 0.0, "recent_mood_avg": None}
    )
    # physical=100, mental=70 (neutral default), stability=100 -> weighted 0.4/0.4/0.2
    expected = round(100 * 0.4 + 70 * 0.4 + 100 * 0.2)
    assert score == expected


@pytest.mark.asyncio
async def test_higher_risk_score_lowers_wellness(engine):
    calm = await engine.calculate_wellness_score(
        uuid4(), {"risk_score": 10.0, "anomaly_rate": 0.0, "recent_mood_avg": 80.0}
    )
    stressed = await engine.calculate_wellness_score(
        uuid4(), {"risk_score": 90.0, "anomaly_rate": 0.0, "recent_mood_avg": 80.0}
    )
    assert stressed < calm


@pytest.mark.asyncio
async def test_score_is_bounded_0_100(engine):
    score = await engine.calculate_wellness_score(
        uuid4(), {"risk_score": -50.0, "anomaly_rate": -1.0, "recent_mood_avg": 500.0}
    )
    assert 0 <= score <= 100


# ---- get_wellness_breakdown (gathers its own data) ----

def _make_sensor_row(hr=70, temp=22, noise=55, spo2=98):
    row = MagicMock()
    row.heart_rate = hr
    row.temperature = temp
    row.noise = noise
    row.blood_oxygen = spo2
    return row


def _make_checkin(mood_score):
    row = MagicMock()
    row.mood_score = mood_score
    return row


@pytest.mark.asyncio
async def test_breakdown_with_no_repos_uses_defaults():
    engine = RuleWellnessEngine()
    result = await engine.get_wellness_breakdown(uuid4())

    assert result["physical"] == 100.0  # no sensor data -> risk_score stays 0
    assert result["stability"] == 100.0  # no anomaly signal
    assert result["mental"] == 70.0  # neutral default, no check-ins
    assert "overall" in result


@pytest.mark.asyncio
async def test_breakdown_uses_real_checkins_for_mental_component():
    checkin_repo = AsyncMock()
    checkin_repo.get_recent.return_value = [_make_checkin(90), _make_checkin(80)]

    engine = RuleWellnessEngine(wellness_checkin_repo=checkin_repo)
    result = await engine.get_wellness_breakdown(uuid4())

    assert result["mental"] == 85.0  # avg(90, 80)


@pytest.mark.asyncio
async def test_breakdown_uses_risk_engine_for_physical_component():
    sensor_repo = AsyncMock()
    sensor_repo.get_history.return_value = [_make_sensor_row(hr=160)]

    risk_engine = AsyncMock()
    risk_engine.evaluate_current_risk.return_value = {
        "risk_score": 80.0, "risk_level": "HIGH", "reasons": ["Elevated heart rate."]
    }

    engine = RuleWellnessEngine(sensor_data_repo=sensor_repo, risk_engine=risk_engine)
    result = await engine.get_wellness_breakdown(uuid4())

    assert result["physical"] == 20.0  # 100 - 80
    risk_engine.evaluate_current_risk.assert_awaited_once()


@pytest.mark.asyncio
async def test_breakdown_uses_pattern_engine_for_stability_component():
    sensor_repo = AsyncMock()
    sensor_repo.get_history.return_value = [_make_sensor_row(), _make_sensor_row(), _make_sensor_row(), _make_sensor_row()]

    pattern_engine = AsyncMock()
    pattern_engine.detect_anomalies.return_value = [
        {"is_anomaly": True}, {"is_anomaly": False}, {"is_anomaly": False}, {"is_anomaly": False}
    ]

    engine = RuleWellnessEngine(sensor_data_repo=sensor_repo, pattern_engine=pattern_engine)
    result = await engine.get_wellness_breakdown(uuid4())

    assert result["stability"] == 75.0  # 100 - (1/4)*100
