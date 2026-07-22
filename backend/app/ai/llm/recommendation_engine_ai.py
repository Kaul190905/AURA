import json
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.ai.recommendation_engine import IRecommendationEngine, RecommendationEngine

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a supportive wellness assistant inside AURA, a sensory-overload monitoring app.

You will be given a list of pre-approved recommendation categories that a deterministic rule engine has already determined are safe and relevant for this user's current context, plus some context about their sensor readings and preferences.

Your ONLY job is to rewrite each approved recommendation as a warm, concise, personalized message. Rules:
1. Produce exactly as many recommendations as you were given, in the same order.
2. Do not add, remove, merge, or invent recommendations beyond the approved list.
3. Do not give medical diagnoses, medication advice, or claims beyond general comfort/wellness guidance.
4. Keep each recommendation under 30 words.
5. Respond with ONLY a JSON array of strings, and nothing else — no markdown, no explanation.
"""


class AIRecommendationEngine(IRecommendationEngine):
    """
    Hybrid recommendation engine: a deterministic RecommendationEngine
    (rules.json) decides WHICH categories are safe/eligible for the current
    context — that boundary never changes. This class only asks an LLM to
    rephrase/personalize the eligible set into natural language; it can
    never introduce a recommendation the rule engine didn't already approve.

    Falls back to the rule engine's plain text whenever the LLM is
    unavailable, misconfigured, or returns something that fails validation
    — a formatting hiccup from the model should never break the
    recommendation response.

    Deliberately NOT used in the real-time sensor-ingestion hot path (see
    SensorDataService) — LLM latency/cost per call is unsuitable for an
    endpoint that may be hit every few seconds by a device. Use it only for
    on-demand personalization (see app/services/recommendation_service.py).
    """

    def __init__(
        self,
        rule_engine: RecommendationEngine,
        api_key: Optional[str] = None,
        model: str = "claude-haiku-4-5-20251001",
        max_tokens: int = 1024,
        client: Any = None,
    ):
        self.rule_engine = rule_engine
        self.model = model
        self.max_tokens = max_tokens

        if client is not None:
            self.client = client
        elif api_key:
            import anthropic

            self.client = anthropic.AsyncAnthropic(api_key=api_key)
        else:
            self.client = None

    async def generate_recommendations(self, user_id: UUID, context: Dict[str, Any]) -> List[str]:
        eligible = await self.rule_engine.generate_recommendations(user_id, context)

        if not eligible:
            return []  # nothing to phrase — skip the API call entirely (cost + latency)

        if self.client is None:
            return eligible

        try:
            personalized = await self._personalize(eligible, context)
        except Exception as e:
            logger.warning("AI recommendation phrasing failed (%s) — falling back to rule-based text.", e)
            return eligible

        if not self._is_valid(personalized, eligible):
            logger.warning("AI recommendation phrasing returned an invalid shape — falling back to rule-based text.")
            return eligible

        return personalized

    async def _personalize(self, eligible: List[str], context: Dict[str, Any]) -> List[str]:
        user_prompt = self._build_prompt(eligible, context)

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        text = "".join(block.text for block in response.content if hasattr(block, "text"))
        return json.loads(self._strip_code_fence(text))

    @staticmethod
    def _strip_code_fence(text: str) -> str:
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            if text.endswith("```"):
                text = text[:-3]
        return text.strip()

    @staticmethod
    def _build_prompt(eligible: List[str], context: Dict[str, Any]) -> str:
        sensor_data = context.get("sensor_data", {})
        preferences = context.get("preferences", {})
        risk_score = context.get("risk_score")

        return (
            f"Approved recommendation categories ({len(eligible)}):\n"
            + json.dumps(eligible, indent=2)
            + "\n\nContext:\n"
            + json.dumps(
                {
                    "risk_score": risk_score,
                    "sensor_data": sensor_data,
                    "preferences": preferences,
                },
                default=str,
                indent=2,
            )
        )

    @staticmethod
    def _is_valid(personalized: Any, eligible: List[str]) -> bool:
        return (
            isinstance(personalized, list)
            and len(personalized) == len(eligible)
            and all(isinstance(item, str) and item.strip() for item in personalized)
        )

    async def evaluate_recommendation_effectiveness(self, user_id: UUID, recommendation_id: UUID) -> float:
        return await self.rule_engine.evaluate_recommendation_effectiveness(user_id, recommendation_id)
