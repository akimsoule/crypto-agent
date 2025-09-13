import { endpoint } from "./_lib/middleware.mts";

// Petite aide pour convertir proprement en nombre
function toNum(v: unknown, def = 0): number {
  if (v === null || v === undefined) return def;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : def;
}

export default endpoint({
  methods: ["GET"],
  auth: false,
  handler: async ({ prisma }) => {
    const profiles = await prisma.investorProfile.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      include: {
        // On ne récupère que ce qui est nécessaire pour la liste
        Order: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { orderId: true, symbol: true, createdAt: true },
        },
        Position: {
          // minimal pour calculer un total unrealized simple et compter les actives
          select: { unrealizedPL: true },
        },
      },
    });

    return profiles.map((p) => {
      const initialBalance = p.initialBalance ?? 0;
      // Somme des PnL latents si disponible
      const totalUnrealized = (p.Position ?? []).reduce(
        (acc, x) => acc + toNum(x.unrealizedPL),
        0
      );
      const totalValue = initialBalance + totalUnrealized;
      const totalReturn = totalValue - initialBalance;
      const totalReturnPercent =
        initialBalance > 0 ? (totalReturn / initialBalance) * 100 : 0;

      // Investments récents (ordre décroissant déjà garanti par la requête)
      const investments = (p.Order ?? []).map((o) => ({
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
        // Gain courant (PnL latent) si positions ouvertes
        currentGain: (p.Position ?? []).length > 0 ? totalUnrealized : 0,
        winRate: 0, // inconnu sur la liste (calcul détaillé ailleurs)
        avgWinPercent: 0,
        avgLossPercent: 0,
        maxDrawdown: 0,
        totalTrades: (p.Order ?? []).length,
        winningTrades: 0,
        losingTrades: 0,
        activePositions: (p.Position ?? []).length,
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
