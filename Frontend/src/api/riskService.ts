import { apiFetch, DEV_USER_ID } from './config';

// ── Risk Trend Types ───────────────────────────────────────────────────────────
export interface RiskTrendResponse {
  status: string;
  user_id?: string;
  days?: number;
  trend?: Array<{
    date: string;
    avg_score: number;
    event_count: number;
  }>;
  message?: string;
}

/**
 * Fetch historical risk trend data for the Insights screen chart.
 * Only returns real trend data when ML risk engine is active.
 * Returns { status: "not_implemented" } for rule-based engine.
 */
export async function getRiskTrend(
  userId: string = DEV_USER_ID,
  days = 7,
): Promise<RiskTrendResponse | null> {
  return apiFetch<RiskTrendResponse>(
    `/risk/trend?user_id=${userId}&days=${days}`,
  );
}
