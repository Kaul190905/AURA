import pytest
import uuid
from datetime import datetime
from app.ai.exceptions import AIValidationError
from app.ai.validators import SensorDataValidator
from app.ai.preprocessing import SensorPreprocessor
from app.ai.feature_engineering import FeatureEngineer
from app.ai.feature_store import FeatureStore
from app.ai.engines.risk_engine import RiskEngine
from app.ai.engines.prediction_engine import PredictionEngine
from app.ai.engines.wellness_engine import WellnessEngine
from app.ai.engines.pattern_engine import PatternEngine
from app.ai.engines.decision_engine import DecisionEngine
from app.ai.engines.recommendation_engine import RecommendationEngine
from app.ai.services.ai_service import AIService

@pytest.fixture
def sample_valid_telemetry():
    return {
        "heart_rate": 75.0,
        "temperature": 36.6,
        "noise": 45.0,
        "blood_oxygen": 98.0,
        "latitude": 37.7749,
        "longitude": -122.4194,
        "timestamp": datetime.utcnow()
    }

def test_sensor_validator_valid_input(sample_valid_telemetry):
    validator = SensorDataValidator()
    validated = validator.validate(sample_valid_telemetry)
    assert validated["heart_rate"] == 75.0
    assert validated["temperature"] == 36.6

def test_sensor_validator_missing_values():
    validator = SensorDataValidator()
    bad_data = {
        "heart_rate": 75.0,
        "temperature": 36.6
        # missing noise and blood_oxygen
    }
    with pytest.raises(AIValidationError) as excinfo:
        validator.validate(bad_data)
    assert "Missing required sensor field" in str(excinfo.value)

def test_sensor_validator_invalid_values():
    validator = SensorDataValidator()
    bad_data = {
        "heart_rate": 250.0, # Physically implausible
        "temperature": 36.6,
        "noise": 45.0,
        "blood_oxygen": 98.0
    }
    with pytest.raises(AIValidationError) as excinfo:
        validator.validate(bad_data)
    assert "physically implausible" in str(excinfo.value)

def test_sensor_validator_duplicate_detection(sample_valid_telemetry):
    validator = SensorDataValidator()
    validator.validate(sample_valid_telemetry)
    # Validate the same data again
    with pytest.raises(AIValidationError) as excinfo:
        validator.validate(sample_valid_telemetry)
    assert "Duplicate sensor entry detected" in str(excinfo.value)

def test_sensor_preprocessor(sample_valid_telemetry):
    preprocessor = SensorPreprocessor()
    res = preprocessor.preprocess(sample_valid_telemetry)
    assert res.heart_rate == 75.0
    assert res.is_scaled is True

def test_feature_engineer(sample_valid_telemetry):
    preprocessor = SensorPreprocessor()
    preprocessed = preprocessor.preprocess(sample_valid_telemetry)
    
    engineer = FeatureEngineer()
    history = [
        {"heart_rate": 70.0, "noise": 40.0, "temperature": 36.5, "blood_oxygen": 98.0},
        {"heart_rate": 72.0, "noise": 42.0, "temperature": 36.5, "blood_oxygen": 98.0}
    ]
    features = engineer.engineer_features(preprocessed, history)
    assert features.rolling_mean_hr > 0.0
    assert features.hour_of_day >= 0

@pytest.mark.asyncio
async def test_risk_engine(sample_valid_telemetry):
    preprocessor = SensorPreprocessor()
    preprocessed = preprocessor.preprocess(sample_valid_telemetry)
    engineer = FeatureEngineer()
    features = engineer.engineer_features(preprocessed, [])
    
    engine = RiskEngine()
    context = {"heart_rate_threshold": 100.0, "noise_threshold": 75.0}
    res = await engine.predict(features, context)
    assert res.risk_level in ["LOW", "MEDIUM", "HIGH"]
    assert res.risk_score >= 0.0

@pytest.mark.asyncio
async def test_full_pipeline_execution(sample_valid_telemetry):
    user_id = uuid.uuid4()
    service = AIService()
    response = await service.process_sensor_data(user_id, sample_valid_telemetry)
    
    assert response.risk is not None
    assert response.prediction is not None
    assert response.wellness is not None
    assert response.pattern is not None
    assert response.decision is not None
    assert response.recommendation is not None
    assert response.metadata.execution_time_ms > 0.0
