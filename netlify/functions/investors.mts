import { endpoint } from "./_lib/middleware.mts";
import {
  baseFromSymbol,
  computeUnrealized,
  getPriceMap,
  reconstructStates,
  toNum,
  
} from "./_lib/pnl.mts";
import type { State, OrderLite } from "./_lib/pnl.mts";

// Types Prisma dérivés pour typer précisément la réponse et éviter les any implicites
// Types locaux minimaux pour limiter la dépendance aux types Prisma générés
type OrderLiteSelect = {
  orderId: string;
  symbol: string;
  createdAt: Date;
  baseVolume: unknown;
  priceAvg: unknown;
  side?: string | null;
  posSide?: string | null;
};
type ProfileWithOrders = {
  id: string;
  name: string;
  type: string;
  initialBalance: unknown | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  riskTolerance: unknown | null;
  maxPositionSize: unknown | null;
  strategyName: string;
  Order: OrderLiteSelect[];
};

// Helpers pour réduire la complexité cognitive et clarifier les métriques
function calcPerSymbolUnrealized(
  states: Map<string, State>,
  priceMap: Map<string, number>,
  onlySide?: "long" | "short"
): { symbol: string; unrealized: number }[] {
  const arr: { symbol: string; unrealized: number }[] = [];
  for (const st of states.values()) {
    if (st.qty <= 0 || st.avg <= 0) continue;
    if (onlySide && st.side !== onlySide) continue;
    const px = priceMap.get(st.base) ?? st.avg;
    const unrealized = st.side === "long" ? (px - st.avg) * st.qty : (st.avg - px) * st.qty;
    arr.push({ symbol: `${st.base}USDT`, unrealized });
  }
  arr.sort((a, b) => b.unrealized - a.unrealized);
  return arr;
}

function calcUnrealizedDispersion(values: number[]): number {
  if (!values || values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export default endpoint({
  methods: ["GET"],
  auth: false,
  handler: async ({ req, prisma }) => {
    const url = new URL(req.url);
    const sideParam = (url.searchParams.get("side") || "").toLowerCase();
    const onlySide =
      sideParam === "long" || sideParam === "short"
        ? (sideParam as "long" | "short")
        : undefined;
    const includeInactive = url.searchParams.get("includeInactive") === "1";
    const metrics = url.searchParams.get("metrics") === "1";

    const profiles: ProfileWithOrders[] = await prisma.investorProfile.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: "asc" },
      include: {
        Order: {
          orderBy: { createdAt: "asc" },
          take: 300, // un peu plus d'historique
          select: {
            orderId: true,
            symbol: true,
            createdAt: true,
            baseVolume: true,
            priceAvg: true,
            side: true,
            posSide: true,
          },
        },
      },
    });

    // Charger les dernières exécutions pour ces profils (sans recalcul)
    const profileIds = profiles.map((p) => p.id);
    const execRows = profileIds.length
      ? await prisma.investorSymbolExecution.findMany({
          where: { profileId: { in: profileIds } },
        })
      : [];
    const execByProfile = new Map<string, { lastExecutions: Array<{ symbol: string; lastExecutedAt: string }>; lastExecutedAt: string | null }>();
    for (const pid of profileIds) execByProfile.set(pid, { lastExecutions: [], lastExecutedAt: null });
    for (const r of execRows) {
      const item = execByProfile.get(r.profileId);
      if (!item) continue;
      const iso = r.lastExecutedAt.toISOString();
      item.lastExecutions.push({ symbol: r.symbol, lastExecutedAt: iso });
      if (!item.lastExecutedAt || iso > item.lastExecutedAt) item.lastExecutedAt = iso;
    }

    const allBaseSymbols: string[] = Array.from(
      new Set(
        profiles.flatMap((p: ProfileWithOrders) =>
          (p.Order ?? []).map((o: OrderLiteSelect) => baseFromSymbol(o.symbol))
        )
      )
    );
    let priceMap: Map<string, number> = new Map();
    try {
      priceMap = await getPriceMap(allBaseSymbols, { ttlMs: 15_000 });
    } catch (e) {
      // Fallback silencieux: on laissera les prix avg remplacer
      console.warn('[investors] getPriceMap failed', (e as Error).message);
    }

    // Pré-agrégations realized en une seule requête par profil (group by profileId)
    let realizedByProfile = new Map<string, number>();
    try {
      const realizedRows = await prisma.closedPosition.groupBy({
        by: ['profileId'],
        _sum: { realizedPnl: true },
        where: { profileId: { in: profileIds } },
      });
      for (const r of realizedRows) {
        realizedByProfile.set(r.profileId, Number(r._sum.realizedPnl || 0));
      }
    } catch (e) {
      console.warn('[investors] groupBy closedPosition failed', (e as Error).message);
    }

    // Récupérer currentBalance pour les mêmes profils (deuxième requête batch)
    let balances: Array<{ id: string; currentBalance: unknown; initialBalance: unknown } > = [];
    try {
      balances = await prisma.investorProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, currentBalance: true, initialBalance: true },
      });
    } catch (e) {
      console.warn('[investors] fetch balances failed', (e as Error).message);
    }
    const balanceMap = new Map<string, { current?: number; initial?: number }>();
    for (const b of balances) balanceMap.set(b.id, { current: b.currentBalance != null ? Number(b.currentBalance) : undefined, initial: b.initialBalance != null ? Number(b.initialBalance) : undefined });

    return profiles.map((p: ProfileWithOrders) => {
      const initialBalance = toNum(p.initialBalance);
      // Agrégat realized
      // (On ne fait pas d'await dans map synchrone; on aurait pu pré-agréger mais ici simplicité: moved to Promise.all pattern futur si besoin)
      const states = reconstructStates((p.Order ?? []) as unknown as OrderLite[], { onlySide });
      let totalUnrealized = 0;
      let activePositions = 0;
      try {
        const res = computeUnrealized(states, priceMap, { onlySide });
        totalUnrealized = res.totalUnrealized;
        activePositions = res.activePositions;
      } catch (e) {
        console.warn('[investors] computeUnrealized error', (e as Error).message);
      }

      // Calcul détaillé per symbol latent (unrealized) + métriques optionnelles
      let metricsObj: Record<string, unknown> = {};
      if (metrics) {
        try {
          const perSymbolUnrealized = calcPerSymbolUnrealized(
            states,
            priceMap,
            onlySide
          );
          const topSymbol: string | null = perSymbolUnrealized[0]?.symbol ?? null;
          const volatilityProxy =
            initialBalance > 0
              ? Math.abs(totalUnrealized / initialBalance) * 100
              : undefined;
          const unrealizedDispersion = calcUnrealizedDispersion(
            perSymbolUnrealized.map((x) => x.unrealized)
          );
          metricsObj = {
            perSymbolUnrealized,
            topSymbol,
            volatilityProxy,
            unrealizedDispersion,
          };
        } catch (e) {
          console.warn('[investors] perSymbol calc error', (e as Error).message);
        }
      }

      const totalValue = initialBalance + totalUnrealized;
      const totalReturn = totalValue - initialBalance;
      const totalReturnPercent =
        initialBalance > 0 ? (totalReturn / initialBalance) * 100 : 0;

      // Marge: si champ currentBalance disponible, calcul totalGain vs initialBalance
      // On lira direct currentBalance par requête supplémentaire plus tard si nécessaire pour performance.
      // Placeholders (non résolus ici pour éviter N requêtes) -> front utilisera investorDetail pour détail.
      const realizedPnlTotal = realizedByProfile.get(p.id);
      const balanceInfo = balanceMap.get(p.id);
      let totalGain: number | undefined = undefined;
      if (balanceInfo?.current != null && balanceInfo.initial != null) {
        totalGain = balanceInfo.current - balanceInfo.initial;
      } else if (realizedPnlTotal != null) {
        // fallback: realized + latent courant (approx)
        totalGain = realizedPnlTotal + totalUnrealized;
      }
      const totalGainPercent = (totalGain != null && initialBalance > 0) ? (totalGain / initialBalance) * 100 : undefined;

      const investments = (p.Order ?? [])
        .slice(-10)
        .reverse()
        .map((o: OrderLiteSelect) => ({
          id: o.orderId,
          investorId: p.id,
          coinId: o.symbol,
          symbol: o.symbol,
          timestamp: o.createdAt.toISOString(),
        }));

      const snapshotNow = {
        id: 0,
        investorId: p.id,
        timestamp: new Date().toISOString(),
        totalValue,
        cashBalance: initialBalance,
        totalReturn,
        totalReturnPercent,
        currentGain: activePositions > 0 ? totalUnrealized : 0,
        winRate: 0,
        avgWinPercent: 0,
        avgLossPercent: 0,
        maxDrawdown: 0,
        totalTrades: (p.Order ?? []).length,
        winningTrades: 0,
        losingTrades: 0,
        activePositions,
        positions: [],
      };

      const execInfo = execByProfile.get(p.id) || { lastExecutions: [], lastExecutedAt: null };
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        active: p.isActive,
        riskTolerance: toNum(p.riskTolerance ?? 0),
        maxPositionSize: toNum(p.maxPositionSize ?? 0),
        holdingPeriod: 0,
        sellThreshold: 0,
        stopLoss: 0,
        sentimentWeight: 0,
        technicalWeight: 0,
        description: p.strategyName,
        initialBalance,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        investments,
        portfolioSnapshots: [snapshotNow],
        lastExecutions: execInfo.lastExecutions,
        lastExecutedAt: execInfo.lastExecutedAt,
        realizedPnlTotal,
        totalGain,
        totalGainPercent,
        ...metricsObj,
      };
    });
  },
});
