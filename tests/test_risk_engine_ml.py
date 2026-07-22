import numpy as np
import pytest
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.ai.ml.risk_engine_ml import MLRiskEngine
from app.ai.ml.risk_features import RISK_FEATURE_KEYS, build_risk_feature_dict
from app.ai.risk_engine import RiskEngine


async def _train_tiny_model():
    """Trains a small real GradientBoostingRegressor distilled from the rule
    engine, so these tests exercise the actual sklearn pipeline rather than a
    stub — same approach used for the pattern-engine tests."""
    rule_engine = RiskEngine()
    rng = np.random.RandomState(42)
    X, y = [], []
    for _ in range(300):
        telemetry = {
            "heart_rate": float(rng.uniform(50, 180)),
            "temperature": float(rng.uniform(10, 40)),
            "noise": float(rng.uniform(20, 120)),
            "blood_oxygen": float(rng.uniform(88, 100)),
        }
        preferences = {"preferred_temperature": 22.0, "preferred_noise": 60.0}
        result = await rule_engine.evaluate_current_risk(telemetry, preferences)
        feats = build_risk_feature_dict(telemetry, preferences)
        X.append([feats[k] for k in RISK_FEATURE_KEYS])
        y.append(result["risk_score"])

    X = np.array(X)
    y = np.array(y)
    scaler = StandardScaler().fit(X)
    model = GradientBoostingRegressor(random_state=42, n_estimators=50, max_depth=3)
    model.fit(scaler.transform(X), y)
    return model, scaler


@pytest.fixture
async def trained_model_and_scaler():
    return await _train_tiny_model()


@pytest.fixture
async def trained_engine(trained_model_and_scaler):
    model, scaler = trained_model_and_scaler
    return MLRiskEngine(model=model, scaler=scaler)


PREFS = {"preferred_temperature": 22.0, "preferred_noise": 60.0}


# ---- evaluate_current_risk ----

@pytest.mark.asyncio
async def test_elevated_heart_rate_scores_higher_than_baseline(trained_engine):
    baseline = await trained_engine.evaluate_current_risk(
        {"heart_rate": 70, "temperature": 22, "noise": 55, "blood_oxygen": 98}, PREFS
    )
    elevated = await trained_engine.evaluate_current_risk(
        {"heart_rate": 165, "temperature": 22, "noise": 55, "blood_oxygen": 98}, PREFS
    )
    assert elevated["risk_score"] > baseline["risk_score"]


@pytest.mark.asyncio
async def test_score_is_clamped_to_0_100(trained_engine):
    result = await trained_engine.evaluate_current_risk(
        {"heart_rate": 300, "temperature": 60, "noise": 200, "blood_oxygen": 40}, PREFS
    )
    assert 0.0 <= result["risk_score"] <= 100.0


@pytest.mark.asyncio
async def test_risk_level_matches_score_thresholds(trained_engine):
    result = await trained_engine.evaluate_current_risk(
        {"heart_rate": 70, "temperature": 22, "noise": 55, "blood_oxygen": 98}, PREFS
    )
    score = result["risk_score"]
    expected = "LOW" if score < 34 else "MEDIUM" if score < 67 else "HIGH"
    assert result["risk_level"] == expected


@pytest.mark.asyncio
async def test_reasons_returned_as_list_of_strings(trained_engine):
    result = await trained_engine.evaluate_current_risk(
        {"heart_rate": 170, "temperature": 22, "noise": 55, "blood_oxygen": 98}, PREFS
    )
    assert isinstance(result["reasons"], list)
    assert all(isinstance(r, str) for r in result["reasons"])


@pytest.mark.asyncio
async def test_calm_reading_produces_fallback_reason_when_no_contribution(trained_engine):
    result = await trained_engine.evaluate_current_risk(
        {"heart_rate": 70, "temperature": 22, "noise": 55, "blood_oxygen": 98}, PREFS
    )
    if result["risk_score"] == 0.0:
        assert result["reasons"] == ["All metrics are within optimal and preferred ranges."]


# ---- construction ----

def test_missing_model_file_raises_file_not_found():
    with pytest.raises(FileNotFoundError):
        MLRiskEngine(model_path="nonexistent/path/model.joblib")


def test_injected_model_and_scaler_skip_file_load():
    model = MagicMock()
    scaler = MagicMock()
    engine = MLRiskEngine(model=model, scaler=scaler)
    assert engine.model is model
    assert engine.scaler is scaler


# ---- analyze_historical_risk ----

@pytest.mark.asyncio
async def test_analyze_historical_risk_without_repo_raises(trained_engine):
    with pytest.raises(RuntimeError):
        await trained_engine.analyze_historical_risk(uuid4(), 7)


@pytest.mark.asyncio
async def test_analyze_historical_risk_no_data_returns_status(trained_model_and_scaler):
    model, scaler = trained_model_and_scaler
    repo = AsyncMock()
    repo.get_history.return_value = []
    engine = MLRiskEngine(model=model, scaler=scaler, sensor_data_repo=repo)

    result = await engine.analyze_historical_risk(uuid4(), 7)

    assert result == {"status": "no_data", "time_window_days": 7}


def _make_sensor_row(heart_rate, temperature=22, noise=55, blood_oxygen=98):
    row = MagicMock()
    row.heart_rate = heart_rate
    row.temperature = temperature
    row.noise = noise
    row.blood_oxygen = blood_oxygen
    return row


@pytest.mark.asyncio
async def test_analyze_historical_risk_detects_increasing_trend(trained_model_and_scaler):
    model, scaler = trained_model_and_scaler
    repo = AsyncMock()
    repo.get_history.return_value = [_make_sensor_row(60 + i * 8) for i in range(15)]
    engine = MLRiskEngine(model=model, scaler=scaler, sensor_data_repo=repo)

    result = await engine.analyze_historical_risk(uuid4(), 7)

    assert result["status"] == "ok"
    assert result["samples_analyzed"] == 15
    assert result["trend"] == "increasing"
    assert result["trend_slope"] > 0


@pytest.mark.asyncio
async def test_analyze_historical_risk_detects_stable_trend(trained_model_and_scaler):
    model, scaler = trained_model_and_scaler
    repo = AsyncMock()
    repo.get_history.return_value = [_make_sensor_row(70) for _ in range(15)]
    engine = MLRiskEngine(model=model, scaler=scaler, sensor_data_repo=repo)

    result = await engine.analyze_historical_risk(uuid4(), 7)

    assert result["status"] == "ok"
    assert result["trend"] == "stable"
