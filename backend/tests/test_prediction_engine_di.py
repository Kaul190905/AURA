import pytest
from unittest.mock import AsyncMock, patch

from app.ai.prediction_engine import RulePredictionEngine
from app.ai.ml.prediction_engine_ml import MLPredictionEngine
from app.api.dependencies.services import get_prediction_engine
from app.core.settings import settings


@pytest.fixture(autouse=True)
def _restore_flag():
    original = settings.USE_ML_PREDICTION_ENGINE
    yield
    settings.USE_ML_PREDICTION_ENGINE = original


def test_flag_disabled_returns_rule_engine():
    settings.USE_ML_PREDICTION_ENGINE = False
    engine = get_prediction_engine(sensor_repo=AsyncMock())
    assert isinstance(engine, RulePredictionEngine)
    assert not isinstance(engine, MLPredictionEngine)


def test_flag_enabled_and_model_exists_returns_ml_engine():
    settings.USE_ML_PREDICTION_ENGINE = True
    engine = get_prediction_engine(sensor_repo=AsyncMock())
    assert isinstance(engine, MLPredictionEngine)


def test_flag_enabled_but_model_missing_falls_back_to_rules():
    settings.USE_ML_PREDICTION_ENGINE = True
    with patch(
        "app.ai.ml.prediction_engine_ml.MLPredictionEngine.__init__",
        side_effect=FileNotFoundError("no model artifact"),
    ):
        engine = get_prediction_engine(sensor_repo=AsyncMock())
    assert isinstance(engine, RulePredictionEngine)
    assert not isinstance(engine, MLPredictionEngine)
