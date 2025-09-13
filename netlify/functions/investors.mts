import { endpoint } from "./_lib/middleware.mts";
import {
  baseFromSymbol,
  computeUnrealized,
  getPriceMap,
  reconstructStates,
} from "./_lib/pnl.mts";

export default endpoint({
  methods: ["GET"],
  auth: false,
  handler: async ({ req, prisma }) => {
    const url = new URL(req.url);
    const sideParam = (url.searchParams.get("side") || "").toLowerCase();
    const onlySide = sideParam === "long" || sideParam === "short" ? (sideParam as "long" | "short") : undefined;
    const profiles = await prisma.investorProfile.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      include: {
        // On ne récupère que ce qui est nécessaire pour la liste
        Order: {
          // On remonte plus d'ordres en asc pour reconstruire la position ouverte (DCA/lissage)
          orderBy: { createdAt: "asc" },
          take: 200,
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

    // Construire la liste des symboles de base pour récupérer les prix courants (ex: BTC à partir de BTCUSDT)
    const allBaseSymbols = Array.from(
      new Set(
        profiles.flatMap((p) =>
          (p.Order ?? []).map((o) => baseFromSymbol(o.symbol))
        )
      )
    );
  const priceMap = await getPriceMap(allBaseSymbols, { ttlMs: 15_000 });

    return profiles.map((p) => {
      const initialBalance = p.initialBalance ?? 0;

      // Reconstruire les positions ouvertes à partir des ORDERS (lissage) + PnL via mark price
  const states = reconstructStates((p.Order ?? []) as any, { onlySide });
  const { totalUnrealized, activePositions } = computeUnrealized(states, priceMap, { onlySide });

      const totalValue = initialBalance + totalUnrealized;
      const totalReturn = totalValue - initialBalance;
      const totalReturnPercent =
        initialBalance > 0 ? (totalReturn / initialBalance) * 100 : 0;

      // Investments récents (prendre les 10 derniers chronologiquement)
      const investments = (p.Order ?? [])
        .slice(-10)
        .reverse()
        .map((o) => ({
          id: o.orderId,
          investorId: p.id,
          coinId: o.symbol,
          symbol: o.symbol,
          timestamp: o.createdAt.toISOString(),
        }));

      // Snapshot courant synthétique (suffisant pour la liste)
      const snapshotNow = {
        id: 0,
        investorId: p.id,
        timestamp: new Date().toISOString(),
        totalValue,
        cashBalance: initialBalance, // placeholder
        totalReturn,
        totalReturnPercent,
        // Gain courant (PnL latent) basé sur les ORDERS ouverts (lissage)
        currentGain: activePositions > 0 ? totalUnrealized : 0,
        winRate: 0, // inconnu sur la liste (calcul détaillé ailleurs)
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
      };
    });
  },
});
