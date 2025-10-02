import { endpoint, json } from "./_lib/middleware.mts";
import {
  baseFromSymbol,
  getPriceMap,
  reconstructStates,
  computeUnrealized,
  buildPositionsDetail,
  toNum,
} from "./_lib/pnl.mts";

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

export default endpoint({
  methods: ["GET"],
  auth: false,
  handler: async ({ req, prisma }) => {
    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("includeInactive") === "1";
    const sideParam = (url.searchParams.get("side") || "").toLowerCase();
    const onlySide =
      sideParam === "long" || sideParam === "short"
        ? (sideParam as "long" | "short")
        : undefined;
    const limit = Math.max(
      1,
      Math.min(10, parseInt(url.searchParams.get("limit") || "3", 10))
    );

    // Charger profils + orders nécessaires
    const profiles: ProfileWithOrders[] = await prisma.investorProfile.findMany(
      {
        where: includeInactive ? {} : { isActive: true },
        orderBy: { createdAt: "asc" },
        include: {
          Order: {
            orderBy: { createdAt: "asc" },
            take: 400,
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
      }
    );

    // Prix de marché pour bases utilisées
    const allBaseSymbols: string[] = Array.from(
      new Set(
        profiles.flatMap((p) =>
          (p.Order ?? []).map((o) => baseFromSymbol(o.symbol))
        )
      )
    );
    const priceMap = await getPriceMap(allBaseSymbols, { ttlMs: 15_000 });

    // Agrégations
    const symbolPnL = new Map<string, number>();
    const symbolValues = new Map<string, number[]>();
    const investorRates: {
      id: string;
      name: string;
      rate: number;
      totalReturnPercent: number;
    }[] = [];

    for (const p of profiles) {
      const orders = p.Order ?? [];
      const states = reconstructStates(orders as any, { onlySide });

      // Détails positions (unrealized par base)
      const details = buildPositionsDetail(states, priceMap, { onlySide });
      for (const d of details) {
        // PnL agrégé par symbole
        symbolPnL.set(d.symbol, (symbolPnL.get(d.symbol) || 0) + d.unrealized);
        // Valeurs pour régularité
        const arr = symbolValues.get(d.symbol) || [];
        arr.push(d.unrealized);
        symbolValues.set(d.symbol, arr);
      }

      // Taux de gain par temps
      const { totalUnrealized } = computeUnrealized(states, priceMap, {
        onlySide,
      });
      const initialBalance = toNum(p.initialBalance ?? 0);
      const totalValue = initialBalance + totalUnrealized;
      const totalReturn = totalValue - initialBalance;
      const totalReturnPercent =
        initialBalance > 0 ? (totalReturn / initialBalance) * 100 : 0;
      const oldest = orders.reduce<Date | null>((acc, it) => {
        const d = new Date(it.createdAt);
        return !acc || d < acc ? d : acc;
      }, null);
      const start = oldest || new Date(Date.now() - 24 * 3600 * 1000);
      const days = Math.max(
        0.5,
        (Date.now() - start.getTime()) / (24 * 3600 * 1000)
      );
      const rate = totalReturnPercent / days; // % par jour
      investorRates.push({ id: p.id, name: p.name, rate, totalReturnPercent });
    }

    // Classements
    const topCryptosByPnL = Array.from(symbolPnL.entries())
      .map(([symbol, pnl]) => ({ symbol, pnl }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, limit);

    const topInvestorsByGainRate = investorRates
      .sort((a, b) => b.rate - a.rate)
      .slice(0, limit);

    const topRegularYieldCryptos = Array.from(symbolValues.entries())
      .map(([symbol, vals]) => {
        if (vals.length === 0)
          return { symbol, score: -Infinity, mean: 0, std: 0 };
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance =
          vals.length > 1
            ? vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
              (vals.length - 1)
            : 0;
        const std = Math.sqrt(variance);
        const score = mean > 0 ? mean / (std || 1e-6) : -Infinity;
        return { symbol, score, mean, std };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return json({
      success: true,
      data: {
        topCryptosByPnL,
        topInvestorsByGainRate,
        topRegularYieldCryptos,
      },
    });
  },
});
