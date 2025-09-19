import { endpoint } from "./_lib/middleware.mts";
import {
  baseFromSymbol,
  computeUnrealized,
  getPriceMap,
  reconstructStates,
  
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
  initialBalance: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  riskTolerance: number | null;
  maxPositionSize: number | null;
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

    return profiles.map((p: ProfileWithOrders) => {
      const initialBalance = p.initialBalance ?? 0;
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

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        riskTolerance: p.riskTolerance ?? 0,
        maxPositionSize: p.maxPositionSize ?? 0,
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
        ...metricsObj,
      };
    });
  },
});
