import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type Leaderboards = {
  topCryptosByPnL: { symbol: string; pnl: number }[];
  topInvestorsByGainRate: { id: string; name: string; rate: number; totalReturnPercent: number }[];
  topRegularYieldCryptos: { symbol: string; score: number; mean: number; std: number }[];
};

export type UseLeaderboardsOptions = {
  limit?: number;
  side?: "long" | "short";
  includeInactive?: boolean;
  enabled?: boolean; // si false, ne fetch pas automatiquement
  ttlMs?: number; // cache mémoire
};

type CacheEntry = { at: number; data: Leaderboards };
const cache = new Map<string, CacheEntry>();

function makeKey(opts: { limit: number; side?: "long" | "short"; includeInactive: boolean }) {
  return `limit=${opts.limit}&side=${opts.side || ""}&includeInactive=${opts.includeInactive ? 1 : 0}`;
}

export function useLeaderboards(options: UseLeaderboardsOptions = {}) {
  const {
    limit = 3,
    side,
    includeInactive = false,
    enabled = true,
    ttlMs = 15_000,
  } = options;

  const key = useMemo(
    () => makeKey({ limit, side, includeInactive }),
    [limit, side, includeInactive]
  );
  const [data, setData] = useState<Leaderboards | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (force = false) => {
    const now = Date.now();
    const cached = cache.get(key);
    if (!force && cached && now - cached.at < ttlMs) {
      setData(cached.data);
      return { ok: true } as const;
    }
    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (side) params.set("side", side);
      if (includeInactive) params.set("includeInactive", "1");
      const res = await fetch(`/api/leaderboards?${params}`, { signal: ctl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const payload: Leaderboards | null = body?.data ?? null;
      if (payload) {
        cache.set(key, { at: now, data: payload });
        setData(payload);
      } else {
        throw new Error("Réponse invalide");
      }
      return { ok: true } as const;
    } catch (e) {
      if ((e as any)?.name === "AbortError") return { ok: false as const };
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setError(msg);
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  }, [key, limit, side, includeInactive, ttlMs]);

  useEffect(() => {
    if (!enabled) return;
    load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [enabled, load]);

  const refetch = useCallback(() => load(true), [load]);

  return { data, loading, error, refetch } as const;
}
