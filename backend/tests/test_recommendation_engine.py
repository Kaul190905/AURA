import json
import pytest
from uuid import uuid4

from app.ai.recommendation_engine import RecommendationEngine


@pytest.fixture
def engine():
    return RecommendationEngine()


@pytest.mark.asyncio
async def test_high_risk_score_triggers_recommendation(engine):
    context = {"risk_score": 80, "sensor_data": {}, "preferences": {}}

    recs = await engine.generate_recommendations(uuid4(), context)

    assert any("HIGH" in r.get("description", "") for r in recs)


@pytest.mark.asyncio
async def test_risk_score_below_threshold_does_not_trigger(engine):
    context = {"risk_score": 50, "sensor_data": {}, "preferences": {}}

    recs = await engine.generate_recommendations(uuid4(), context)

    assert not any("HIGH" in r.get("description", "") for r in recs)


@pytest.mark.asyncio
async def test_high_heart_rate_triggers_breathing_exercise_recommendation(engine):
    context = {"risk_score": 0, "sensor_data": {"heart_rate": 120}, "preferences": {}}

    recs = await engine.generate_recommendations(uuid4(), context)

    assert any("breathing exercise" in r.get("description", "") for r in recs)


@pytest.mark.asyncio
async def test_noise_exceeding_preference_by_threshold_triggers_recommendation(engine):
    context = {
        "risk_score": 0,
        "sensor_data": {"noise": 80},
        "preferences": {"preferred_noise": 60},
    }

    recs = await engine.generate_recommendations(uuid4(), context)

    assert any("noise-cancelling" in r.get("description", "") for r in recs)


@pytest.mark.asyncio
async def test_noise_within_threshold_of_preference_does_not_trigger(engine):
    context = {
        "risk_score": 0,
        "sensor_data": {"noise": 65},
        "preferences": {"preferred_noise": 60},
    }

    recs = await engine.generate_recommendations(uuid4(), context)

    assert recs == []


@pytest.mark.asyncio
async def test_temperature_above_preference_triggers_cooling_recommendation(engine):
    context = {
        "risk_score": 0,
        "sensor_data": {"temperature": 30},
        "preferences": {"preferred_temperature": 22},
    }

    recs = await engine.generate_recommendations(uuid4(), context)

    assert any("cooler environment" in r.get("description", "") for r in recs)


@pytest.mark.asyncio
async def test_temperature_below_preference_triggers_warming_recommendation(engine):
    context = {
        "risk_score": 0,
        "sensor_data": {"temperature": 10},
        "preferences": {"preferred_temperature": 22},
    }

    recs = await engine.generate_recommendations(uuid4(), context)

    assert any("warmer clothing" in r.get("description", "") for r in recs)


@pytest.mark.asyncio
async def test_missing_preference_key_skips_preference_based_rules(engine):
    context = {"risk_score": 0, "sensor_data": {"noise": 90}, "preferences": {}}

    recs = await engine.generate_recommendations(uuid4(), context)

    assert recs == []


@pytest.mark.asyncio
async def test_missing_metric_in_sensor_data_is_skipped(engine):
    context = {"risk_score": 0, "sensor_data": {}, "preferences": {"preferred_noise": 60}}

    recs = await engine.generate_recommendations(uuid4(), context)

    assert recs == []


@pytest.mark.asyncio
async def test_multiple_triggered_rules_all_appear(engine):
    context = {
        "risk_score": 80,
        "sensor_data": {"heart_rate": 130, "noise": 90},
        "preferences": {"preferred_noise": 60},
    }

    recs = await engine.generate_recommendations(uuid4(), context)

    assert len(recs) == 3  # high_risk, high_hr, high_noise


@pytest.mark.asyncio
async def test_evaluate_recommendation_effectiveness_is_a_placeholder(engine):
    result = await engine.evaluate_recommendation_effectiveness(uuid4(), uuid4())
    assert result == 0.0


def test_rules_loaded_from_default_rules_json(engine):
    rule_ids = {rule["id"] for rule in engine.rules}
    assert rule_ids == {"high_noise", "high_temp", "low_temp", "high_hr", "high_risk"}


def test_missing_rules_file_results_in_empty_ruleset():
    engine = RecommendationEngine(rules_file_path="this/path/does/not/exist.json")
    assert engine.rules == []


def test_malformed_rules_file_results_in_empty_ruleset(tmp_path):
    bad_file = tmp_path / "bad_rules.json"
    bad_file.write_text("{not valid json")

    engine = RecommendationEngine(rules_file_path=str(bad_file))

    assert engine.rules == []


def test_custom_rules_file_is_respected(tmp_path):
    custom_rules = {
        "rules": [
            {
                "id": "custom_rule",
                "metric": "heart_rate",
                "condition": "absolute_greater_than",
                "threshold": 50,
                "recommendation": {"title": "Custom", "description": "Custom recommendation triggered."},
            }
        ]
    }
    rules_file = tmp_path / "custom_rules.json"
    rules_file.write_text(json.dumps(custom_rules))

    engine = RecommendationEngine(rules_file_path=str(rules_file))

    assert len(engine.rules) == 1
    assert engine.rules[0]["id"] == "custom_rule"
