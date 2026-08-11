from abc import ABC, abstractmethod
from typing import List, Dict, Any
from uuid import UUID
import json
import os

class IRecommendationEngine(ABC):
    """
    Interface for the Recommendation Engine.
    Responsible for generating actionable health and wellness recommendations.
    """

    @abstractmethod
    async def generate_recommendations(self, user_id: UUID, context: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Generate a list of recommendations based on user context and recent data.
        context expects: {"risk_score": float, "sensor_data": dict, "preferences": dict}
        """
        pass

    @abstractmethod
    async def evaluate_recommendation_effectiveness(self, user_id: UUID, recommendation_id: UUID) -> float:
        """
        Evaluate how effective a past recommendation was based on subsequent user behavior/data.
        """
        pass


class RecommendationEngine(IRecommendationEngine):
    """
    Concrete implementation of the Recommendation Engine.
    Loads recommendation rules from a JSON configuration file.
    """

    def __init__(self, rules_file_path: str = None):
        if rules_file_path is None:
            # Default to rules.json in the same directory
            base_dir = os.path.dirname(os.path.abspath(__file__))
            rules_file_path = os.path.join(base_dir, "rules.json")
            
        self.rules = self._load_rules(rules_file_path)

    def _load_rules(self, file_path: str) -> List[Dict[str, Any]]:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                return data.get("rules", [])
        except FileNotFoundError:
            return []
        except json.JSONDecodeError:
            return []

    async def generate_recommendations(self, user_id: UUID, context: Dict[str, Any]) -> List[Dict[str, str]]:
        recommendations = []
        
        risk_score = context.get("risk_score", 0)
        sensor_data = context.get("sensor_data", {})
        preferences = context.get("preferences", {})

        for rule in self.rules:
            metric = rule.get("metric")
            condition = rule.get("condition")
            
            # Map rule metric to actual value
            actual_val = None
            if metric == "risk_score":
                actual_val = risk_score
            else:
                actual_val = sensor_data.get(metric)

            if actual_val is None:
                continue

            # Evaluate rules based on condition type
            if condition == "absolute_greater_than":
                threshold = rule.get("threshold", 0)
                if actual_val > threshold:
                    recommendations.append(rule.get("recommendation"))
                    
            elif condition == "greater_than_preference":
                pref_key = f"preferred_{metric}"
                pref_val = preferences.get(pref_key)
                if pref_val is not None:
                    diff = actual_val - pref_val
                    if diff > rule.get("threshold_diff", 0):
                        recommendations.append(rule.get("recommendation"))
                        
            elif condition == "less_than_preference":
                pref_key = f"preferred_{metric}"
                pref_val = preferences.get(pref_key)
                if pref_val is not None:
                    diff = pref_val - actual_val
                    if diff > rule.get("threshold_diff", 0):
                        recommendations.append(rule.get("recommendation"))

        return recommendations

    async def evaluate_recommendation_effectiveness(self, user_id: UUID, recommendation_id: UUID) -> float:
        """
        Placeholder for evaluating if the user followed the recommendation and if it helped.
        """
        return 0.0
