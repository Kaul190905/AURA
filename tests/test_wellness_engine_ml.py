import numpy as np
import pytest
import random
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.ai.ml.wellness_engine_ml import MLWellnessEngine
from app.ai.ml.wellness_features import WELLNESS_FEATURE_KEYS, build_wellness_feature_dict
from app.ai.wellness_engine import RuleWellnessEngine


async def _train_tiny_model():
    """Trains a small real GradientBoostingRegressor distilled from
    RuleWellnessEngine's formula, exercising the actual sklearn pipeline."""
    rule_engine = RuleWellnessEngine()
    rng = random.Random(42)
    X, y = [], []
    for _ in range(300):
        snapshot = {
            "risk_score": rng.uniform(0, 100),
            "anomaly_rate": rng.uniform(0, 1),
            "recent_mood_avg": rng.choice([None, rng.uniform(0, 100)]),
        }
        label = await rule_engine.calculate_wellness_score(None, snapshot)
        feats = build_wellness_feature_dict(snapshot)
        X.append([feats[k] for k in WELLNESS_FEATURE_KEYS])
        y.append(label)

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
    return MLWellnessEngine(model=model, scaler=scaler)


# ---- calculate_wellness_score ----

@pytest.mark.asyncio
async def test_higher_risk_lowers_score(trained_engine):
    calm = await trained_engine.calculate_wellness_score(
        uuid4(), {"risk_score": 10.0, "anomaly_rate": 0.0, "recent_mood_avg": 80.0}
    )
    stressed = await trained_engine.calculate_wellness_score(
        uuid4(), {"risk_score": 90.0, "anomaly_rate": 0.0, "recent_mood_avg": 80.0}
    )
    assert stressed < calm


@pytest.mark.asyncio
async def test_score_is_clamped_to_0_100(trained_engine):
    score = await trained_engine.calculate_wellness_score(
        uuid4(), {"risk_score": 1000.0, "anomaly_rate": 10.0, "recent_mood_avg": -50.0}
    )
    assert 0 <= score <= 100


@pytest.mark.asyncio
async def test_missing_mood_avg_uses_neutral_default(trained_engine):
    score = await trained_engine.calculate_wellness_score(
        uuid4(), {"risk_score": 20.0, "anomaly_rate": 0.1, "recent_mood_avg": None}
    )
    assert isinstance(score, int)
    assert 0 <= score <= 100


# ---- get_wellness_breakdown inherits RuleWellnessEngine's snapshot gathering ----

@pytest.mark.asyncio
async def test_breakdown_uses_ml_score_for_overall(trained_engine):
    result = await trained_engine.get_wellness_breakdown(uuid4())

    assert "physical" in result
    assert "mental" in result
    assert "stability" in result
    assert "overall" in result
    assert 0 <= result["overall"] <= 100


@pytest.mark.asyncio
async def test_breakdown_reflects_injected_risk_engine(trained_model_and_scaler):
    model, scaler = trained_model_and_scaler
    sensor_repo = AsyncMock()
    row = MagicMock()
    row.heart_rate, row.temperature, row.noise, row.blood_oxygen = 160, 22, 55, 98
    sensor_repo.get_history.return_value = [row]

    risk_engine = AsyncMock()
    risk_engine.evaluate_current_risk.return_value = {"risk_score": 85.0, "risk_level": "HIGH", "reasons": []}

    engine = MLWellnessEngine(
        model=model, scaler=scaler, sensor_data_repo=sensor_repo, risk_engine=risk_engine
    )
    result = await engine.get_wellness_breakdown(uuid4())

    assert result["physical"] == 15.0  # 100 - 85, still the deterministic breakdown formula


# ---- construction ----

def test_missing_model_file_raises_file_not_found():
    with pytest.raises(FileNotFoundError):
        MLWellnessEngine(model_path="nonexistent/path/model.joblib")


def test_injected_model_and_scaler_skip_file_load():
    model = MagicMock()
    scaler = MagicMock()
    engine = MLWellnessEngine(model=model, scaler=scaler)
    assert engine.model is model
    assert engine.scaler is scaler
