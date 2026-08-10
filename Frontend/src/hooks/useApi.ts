import { useState, useEffect, useCallback } from 'react';

// ── Generic API hook ──────────────────────────────────────────────────────────
// Usage:
//   const { data, loading, error, refresh } = useApi(() => getRecommendations(userId), [userId]);

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      console.warn('[useApi] error:', err?.message ?? err);
      setError(err?.message ?? 'An error occurred');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetch();

  }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
