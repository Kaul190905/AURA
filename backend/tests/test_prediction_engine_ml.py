import numpy as np
import pytest
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from unittest.mock import MagicMock
from uuid import uuid4

from app.ai.ml.prediction_engine_ml import MLPredictionEngine
from app.ai.ml.prediction_features import TRAJECTORY_FEATURE_KEYS, build_trajectory_features
from app.ai.prediction_engine import RulePredictionEngine


async def _train_tiny_model():
    """Trains a small real GradientBoostingRegressor distilled from
    RulePredictionEngine's heuristic, exercising the actual sklearn pipeline."""
    teacher = RulePredictionEngine()
    rng = np.random.RandomState(42)
    X, y = [], []
    for _ in range(300):
        length = rng.randint(3, 15)
        start = rng.uniform(0, 100)
        slope = rng.uniform(-8, 8)
        trajectory = [max(0.0, min(100.0, start + slope * i)) for i in range(length)]
        result = await teacher.forecast_overload_event(None, {"risk_scores": trajectory})
        feats = build_trajectory_features(trajectory)
        X.append([feats[k] for k in TRAJECTORY_FEATURE_KEYS])
        y.append(result["overload_probability"])

    X = np.array(X)
    y = np.array(y)
    scaler = StandardScaler().fit(X)
    model = GradientBoostingRegressor(random_state=42, n_estimators=50, max_depth=3)
    model.fit(scaler.transform(X), y)
    return model, scaler


@pytest.fixture
async def trained_engine():
    model, scaler = await _train_tiny_model()
    return MLPredictionEngine(model=model, scaler=scaler)


# ---- forecast_overload_event ----

@pytest.mark.asyncio
async def test_empty_trajectory_returns_zero_without_calling_model(trained_engine):
    result = await trained_engine.forecast_overload_event(uuid4(), {"risk_scores": []})
    assert result["overload_probability"] == 0.0
    assert result["method"] == "MLPredictionEngine"


@pytest.mark.asyncio
async def test_rising_trajectory_scores_higher_than_flat(trained_engine):
    flat = {"risk_scores": [40.0, 40.0, 40.0, 40.0, 40.0]}
    rising = {"risk_scores": [10.0, 20.0, 30.0, 40.0, 50.0]}

    flat_result = await trained_engine.forecast_overload_event(uuid4(), flat)
    rising_result = await trained_engine.forecast_overload_event(uuid4(), rising)

    assert rising_result["overload_probability"] > flat_result["overload_probability"]


@pytest.mark.asyncio
async def test_probability_bounded_0_1(trained_engine):
    extreme = {"risk_scores": [500.0, -500.0, 1000.0]}
    result = await trained_engine.forecast_overload_event(uuid4(), extreme)
    assert 0.0 <= result["overload_probability"] <= 1.0


@pytest.mark.asyncio
async def test_method_field_identifies_ml_engine(trained_engine):
    result = await trained_engine.forecast_overload_event(uuid4(), {"risk_scores": [10.0, 20.0]})
    assert result["method"] == "MLPredictionEngine"


# ---- predict_metric_trend is inherited unchanged from RulePredictionEngine ----

@pytest.mark.asyncio
async def test_predict_metric_trend_without_repo_raises(trained_engine):
    with pytest.raises(RuntimeError):
        await trained_engine.predict_metric_trend(uuid4(), "heart_rate", 6)


# ---- construction ----

def test_missing_model_file_raises_file_not_found():
    with pytest.raises(FileNotFoundError):
        MLPredictionEngine(model_path="nonexistent/path/model.joblib")


def test_injected_model_and_scaler_skip_file_load():
    model = MagicMock()
    scaler = MagicMock()
    engine = MLPredictionEngine(model=model, scaler=scaler)
    assert engine.model is model
    assert engine.scaler is scaler
