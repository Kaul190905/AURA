import pytest
from unittest.mock import AsyncMock, patch

from app.ai.risk_engine import RiskEngine
from app.ai.ml.risk_engine_ml import MLRiskEngine
from app.api.dependencies.services import get_risk_engine
from app.core.settings import settings


@pytest.mark.asyncio
async def test_get_risk_engine_returns_rule_engine_when_flag_disabled():
    original = settings.USE_ML_RISK_ENGINE
    settings.USE_ML_RISK_ENGINE = False
    try:
        engine = get_risk_engine(sensor_repo=AsyncMock())
        assert isinstance(engine, RiskEngine)
    finally:
        settings.USE_ML_RISK_ENGINE = original


@pytest.mark.asyncio
async def test_get_risk_engine_returns_ml_engine_when_flag_enabled_and_model_exists():
    original = settings.USE_ML_RISK_ENGINE
    settings.USE_ML_RISK_ENGINE = True
    try:
        engine = get_risk_engine(sensor_repo=AsyncMock())
        assert isinstance(engine, MLRiskEngine)
    finally:
        settings.USE_ML_RISK_ENGINE = original


@pytest.mark.asyncio
async def test_get_risk_engine_falls_back_to_rules_when_model_missing():
    original = settings.USE_ML_RISK_ENGINE
    settings.USE_ML_RISK_ENGINE = True
    try:
        with patch(
            "app.ai.ml.risk_engine_ml.MLRiskEngine.__init__",
            side_effect=FileNotFoundError("no model artifact"),
        ):
            engine = get_risk_engine(sensor_repo=AsyncMock())
        assert isinstance(engine, RiskEngine)
    finally:
        settings.USE_ML_RISK_ENGINE = original
