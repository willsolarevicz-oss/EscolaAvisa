import { useCallback, useEffect, useState } from 'react';
import { getHealth } from '../services/healthService';

/** Consulta GET /api/health. status: 'loading' | 'ok' | 'degraded' | 'offline' */
export function useApiHealth() {
  const [result, setResult] = useState({ status: 'loading', data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then((data) => {
        if (cancelled) return;
        setResult({ status: data.database === 'ok' ? 'ok' : 'degraded', data });
      })
      .catch(() => {
        if (!cancelled) setResult({ status: 'offline', data: null });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const refresh = useCallback(() => {
    setResult((prev) => ({ ...prev, status: 'loading' }));
    setAttempt((n) => n + 1);
  }, []);

  return { ...result, refresh };
}
