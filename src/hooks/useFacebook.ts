import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface FacebookStats {
  postsToday: number;
  maxPostsPerDay: number;
  lastPostTime: string | null;
  minTimeBetweenPosts: number;
  duplicateThreshold: number;
}

export interface FacebookPostResult {
  success: boolean;
  message: string;
}

export function useFacebookStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState<FacebookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/facebook-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erreur lors du chargement des stats');
      const data: FacebookStats = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

export function useFacebookPost() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const post = useCallback(async (
    type: string,
    customMessage?: string
  ): Promise<FacebookPostResult> => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/facebook-post', {
        method: 'POST',
        headers,
        body: JSON.stringify(
          customMessage
            ? { type: 'custom', customMessage }
            : { type }
        ),
      });
      const result: FacebookPostResult = await response.json();
      if (!result.success) {
        setError(result.message);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { post, loading, error };
}
