import { apiFetch, DEV_USER_ID } from './config';

// ── Recommendation Types ───────────────────────────────────────────────────────
export interface PersonalizedRecommendationResponse {
  user_id: string;
  risk_score: number;
  risk_level: string;
  recommendations: string[];
  method: string;
}

/**
 * Fetch on-demand AI/rule-based recommendations for the user.
 * Uses the LLM engine when USE_AI_RECOMMENDATION_ENGINE=true on backend,
 * otherwise falls back to rule-based engine.
 */
export async function getRecommendations(
  userId: string = DEV_USER_ID,
): Promise<PersonalizedRecommendationResponse | null> {
  return apiFetch<PersonalizedRecommendationResponse>(
    `/recommendations/${userId}`,
  );
}
