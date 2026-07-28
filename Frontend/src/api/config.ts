// ── API Configuration ─────────────────────────────────────────────────────────
// Production backend, deployed on Render — reachable from any device, anywhere.
export const API_BASE_URL = 'https://aura-backend-yit7.onrender.com/api/v1';

// Dev user ID — a stable UUID used across all endpoints during development
// Replace with a real Supabase user UUID once auth is enabled
export const DEV_USER_ID = '7737ba79-0d30-46e1-b6eb-4f41615bf10c';

const REQUEST_TIMEOUT_MS = 8000;

/**
 * Wrapper around fetch with timeout and JSON error handling.
 * Returns null on network failure so callers can gracefully fall back.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[API] ${options?.method ?? 'GET'} ${path} → ${res.status}`, text);
      return null;
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`[API] Timeout: ${path}`);
    } else {
      console.warn(`[API] Error: ${path}`, err?.message ?? err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
