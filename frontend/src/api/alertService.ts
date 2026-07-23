import { apiFetch, DEV_USER_ID } from './config';

// ── Alert Types ────────────────────────────────────────────────────────────────
export interface AlertResponse {
  id: string;
  user_id: string;
  type: string;
  severity: string;
  message: string;
  is_resolved: boolean;
  user_confirmed: boolean | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new alert event in the backend.
 * Called when a high-risk alert is shown to the user.
 *
 * Backend AlertCreate requires: user_id, type, severity, message, is_resolved
 */
export async function createAlert(
  userId: string = DEV_USER_ID,
  severity: 'info' | 'warning' | 'critical',
  message: string,
  alertType = 'sensory_overload',
): Promise<AlertResponse | null> {
  return apiFetch<AlertResponse>('/alerts/', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      type: alertType,
      severity,
      message,
      is_resolved: false,
    }),
  });
}

/**
 * Submit feedback on an alert — confirmed = true means alert was accurate,
 * confirmed = false means it was a false positive / dismissed.
 */
export async function submitAlertFeedback(
  alertId: string,
  confirmed: boolean,
): Promise<AlertResponse | null> {
  return apiFetch<AlertResponse>(`/alerts/${alertId}/feedback`, {
    method: 'PATCH',
    body: JSON.stringify({ confirmed }),
  });
}

/**
 * Retrieve alerts for a user, most recent first.
 */
export async function getAlerts(
  userId: string = DEV_USER_ID,
  limit = 50,
): Promise<AlertResponse[]> {
  const res = await apiFetch<AlertResponse[]>(
    `/alerts/?user_id=${userId}&limit=${limit}&sort_by=desc`,
  );
  return res ?? [];
}
