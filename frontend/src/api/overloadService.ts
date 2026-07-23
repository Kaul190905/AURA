import { apiFetch, DEV_USER_ID } from './config';

// ── Overload Event Types ───────────────────────────────────────────────────────
export interface OverloadEventResponse {
  id: string;
  user_id: string;
  trigger_metric: string;
  trigger_value: number;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

/**
 * Log an overload (crisis) event to the backend.
 * This is the ground-truth signal consumed by the ML PredictionEngine.
 *
 * @param userId           UUID of the user
 * @param triggerMetric    e.g. 'sound', 'light', 'crowd', 'self'
 * @param triggerValue     current risk score (0-10) used as the trigger value
 * @param durationSeconds  how long the session lasted (default 0 at crisis onset)
 */
export async function logOverloadEvent(
  userId: string = DEV_USER_ID,
  triggerMetric: string,
  triggerValue: number,
  durationSeconds = 0,
): Promise<OverloadEventResponse | null> {
  return apiFetch<OverloadEventResponse>('/overload-events/', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      trigger_metric: triggerMetric,
      trigger_value: triggerValue,
      duration_seconds: durationSeconds,
    }),
  });
}

/**
 * Retrieve all logged overload events for a user.
 */
export async function getOverloadEvents(
  userId: string = DEV_USER_ID,
  limit = 50,
): Promise<OverloadEventResponse[]> {
  const res = await apiFetch<OverloadEventResponse[]>(
    `/overload-events/?user_id=${userId}&limit=${limit}&sort_by=desc`,
  );
  return res ?? [];
}
