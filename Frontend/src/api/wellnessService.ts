import { apiFetch, DEV_USER_ID } from './config';

// ── Wellness Types ─────────────────────────────────────────────────────────────
export interface WellnessCheckinResponse {
  id: string;
  user_id: string;
  mood_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WellnessScoreResponse {
  user_id: string;
  wellness_score: number;  // 0–100
  components: Record<string, number>;
  method: string;
}

/**
 * Submit a self-reported wellness check-in.
 * @param userId  UUID of the user
 * @param moodScore  0–100 (maps from frontend selfReport 1–5 * 20)
 * @param notes  Optional free-text notes
 */
export async function submitCheckin(
  userId: string = DEV_USER_ID,
  moodScore: number,
  notes?: string,
): Promise<WellnessCheckinResponse | null> {
  return apiFetch<WellnessCheckinResponse>(`/wellness/${userId}/checkins`, {
    method: 'POST',
    body: JSON.stringify({
      mood_score: Math.max(0, Math.min(100, moodScore)),
      notes: notes ?? null,
    }),
  });
}

/**
 * Retrieve the user's aggregate wellness score from the backend.
 */
export async function getWellnessScore(
  userId: string = DEV_USER_ID,
): Promise<WellnessScoreResponse | null> {
  return apiFetch<WellnessScoreResponse>(`/wellness/${userId}/score`);
}
