import pytest
from uuid import uuid4

from app.ai.risk_engine import RiskEngine


@pytest.fixture
def engine():
    return RiskEngine()


@pytest.mark.asyncio
async def test_all_metrics_within_range_gives_low_risk_and_zero_score(engine):
    telemetry = {"heart_rate": 70, "temperature": 22, "noise": 55}
    preferences = {"preferred_noise": 60, "preferred_temperature": 22}

    result = await engine.evaluate_current_risk(telemetry, preferences)

    assert result["risk_score"] == 0.0
    assert result["risk_level"] == "LOW"
    assert "optimal" in result["reasons"][0].lower()


@pytest.mark.asyncio
async def test_elevated_heart_rate_contributes_to_score(engine):
    telemetry = {"heart_rate": 130, "temperature": 22, "noise": 55}
    preferences = {"preferred_noise": 60, "preferred_temperature": 22}

    result = await engine.evaluate_current_risk(telemetry, preferences)

    assert result["risk_score"] > 0
    assert any("heart rate" in r.lower() for r in result["reasons"])


@pytest.mark.asyncio
async def test_heart_rate_penalty_caps_at_40(engine):
    telemetry = {"heart_rate": 500, "temperature": 22, "noise": 55}
    preferences = {"preferred_noise": 60, "preferred_temperature": 22}

    result = await engine.evaluate_current_risk(telemetry, preferences)

    assert result["risk_score"] == 40.0


@pytest.mark.asyncio
async def test_noise_above_preference_contributes_to_score(engine):
    telemetry = {"heart_rate": 70, "temperature": 22, "noise": 90}
    preferences = {"preferred_noise": 60, "preferred_temperature": 22}

    result = await engine.evaluate_current_risk(telemetry, preferences)

    assert result["risk_score"] > 0
    assert any("noise" in r.lower() for r in result["reasons"])


@pytest.mark.asyncio
async def test_noise_below_preference_is_not_penalized(engine):
    telemetry = {"heart_rate": 70, "temperature": 22, "noise": 30}
    preferences = {"preferred_noise": 60, "preferred_temperature": 22}

    result = await engine.evaluate_current_risk(telemetry, preferences)

    assert result["risk_score"] == 0.0


@pytest.mark.asyncio
async def test_temperature_deviation_hotter_than_preferred(engine):
    telemetry = {"heart_rate": 70, "temperature": 30, "noise": 55}
    preferences = {"preferred_noise": 60, "preferred_temperature": 22}

    result = await engine.evaluate_current_risk(telemetry, preferences)

    assert result["risk_score"] > 0
    assert any("higher than preferred" in r for r in result["reasons"])


@pytest.mark.asyncio
async def test_temperature_deviation_colder_than_preferred(engine):
    telemetry = {"heart_rate": 70, "temperature": 10, "noise": 55}
    preferences = {"preferred_noise": 60, "preferred_temperature": 22}

    result = await engine.evaluate_current_risk(telemetry, preferences)

    assert result["risk_score"] > 0
    assert any("lower than preferred" in r for r in result["reasons"])


@pytest.mark.asyncio
async def test_score_is_capped_at_100(engine):
    telemetry = {"heart_rate": 500, "temperature": 100, "noise": 500}
    preferences = {"preferred_noise": 60, "preferred_temperature": 22}

    result = await engine.evaluate_current_risk(telemetry, preferences)

    assert result["risk_score"] == 100.0
    assert result["risk_level"] == "HIGH"


@pytest.mark.asyncio
async def test_missing_telemetry_and_preferences_default_safely(engine):
    # Missing telemetry defaults to 0 for hr/temp/noise, while missing preferences
    # fall back to preferred_temperature=22.0, so a 22-degree deviation is expected.
    result = await engine.evaluate_current_risk({}, {})

    assert result["risk_score"] == 30.0
    assert any("lower than preferred" in r for r in result["reasons"])


@pytest.mark.asyncio
async def test_missing_preferences_fall_back_to_defaults(engine):
    # Default preferred_noise=60, preferred_temperature=22 should apply.
    telemetry = {"heart_rate": 70, "temperature": 22, "noise": 55}

    result = await engine.evaluate_current_risk(telemetry, {})

    assert result["risk_score"] == 0.0


@pytest.mark.asyncio
async def test_analyze_historical_risk_is_a_placeholder(engine):
    result = await engine.analyze_historical_risk(uuid4(), time_window_days=7)
    assert result == {"status": "not_implemented"}


@pytest.mark.parametrize(
    "score,expected_level",
    [
        (0.0, "LOW"),
        (33.9, "LOW"),
        (34.0, "MEDIUM"),
        (66.9, "MEDIUM"),
        (67.0, "HIGH"),
        (100.0, "HIGH"),
    ],
)
def test_determine_level_boundaries(engine, score, expected_level):
    assert engine._determine_level(score) == expected_level
