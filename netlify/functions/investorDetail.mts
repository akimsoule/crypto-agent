import { endpoint, json } from "./_lib/middleware.mts";
import {
  baseFromSymbol,
  computeUnrealized,
  getPriceMap,
  reconstructStates,
  buildPositionsDetail,
  toNum,
} from "./_lib/pnl.mts";

// Helpers locaux (limiter l'impact sur le reste du code)
// toNum vient de pnl.mts

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / 86_400_000);
}

export default endpoint({
  methods: ["GET"],
  auth: false,
  handler: async ({ req, prisma }) => {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const sideParam = (url.searchParams.get("side") || "").toLowerCase();
    const debug =
      url.searchParams.get("debug") === "1" ||
      url.searchParams.get("debug") === "true";
    const onlySide =
      sideParam === "long" || sideParam === "short"
        ? (sideParam as "long" | "short")
        : undefined;
    if (!id) return json({ success: false, error: "Param id requis" }, 400);

    // Récupération du profil + relations nécessaires
    const profile = await prisma.investorProfile.findUnique({
      where: { id },
      include: {
        Order: {
          orderBy: { createdAt: "asc" },
          take: 500, // suffisant pour reconstruire l'état ouvert
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
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!profile)
      return json({ success: false, error: "Investor introuvable" }, 404);

    // Reconstruire les positions ouvertes à partir des ORDERS (lissage) et calculer via mark price
    const allBaseSymbols = Array.from(
      new Set((profile?.Order ?? []).map((o) => baseFromSymbol(o.symbol)))
    );
    const priceMap = await getPriceMap(allBaseSymbols, { ttlMs: 15_000 });
    const states = reconstructStates((profile?.Order ?? []) as any, {
      onlySide,
    });
    const { totalUnrealized, activePositions } = computeUnrealized(
      states,
      priceMap,
      { onlySide }
    );
    const positionsDetail = buildPositionsDetail(states, priceMap, {
      onlySide,
    });
    // Valeur approximative: balance initiale + PnL latent (en attendant un suivi de balance réel)
    const initialBalance = profile.initialBalance ?? 0;
    const totalValue = initialBalance + totalUnrealized;
    const totalReturn = totalValue - initialBalance;
    const totalReturnPercent =
      initialBalance > 0 ? (totalReturn / initialBalance) * 100 : 0;

    // Construction d'un snapshot courant synthétique
    const currentSnapshot = {
      id: 0, // synthétique (pas stocké en DB)
      investorId: profile.id,
      timestamp: new Date().toISOString(),
      totalValue,
      cashBalance: initialBalance, // placeholder (à raffiner si on suit le cash réellement)
      totalReturn,
      totalReturnPercent,
      // Gain courant basé sur PnL latent depuis ORDERS ouverts
      currentGain: activePositions > 0 ? totalUnrealized : 0,
      winRate: 0, // nécessite historique de trades fermés
      avgWinPercent: 0,
      avgLossPercent: 0,
      maxDrawdown: 0, // nécessite série temporelle
      totalTrades: profile.Order.length, // approximatif
      winningTrades: 0,
      losingTrades: 0,
      activePositions,
      positions: [],
    };

    // Adaptation des snapshots historiques si des métriques sont présentes
    const historical = profile.snapshots.map((s) => {
      const metrics = (s.metrics as any) || {};
      return {
        id: 1, // placeholder uniforme (le front n'utilise peut-être pas encore l'id réel)
        investorId: profile.id,
        timestamp: s.createdAt.toISOString(),
        totalValue: toNum(metrics.totalValue),
        cashBalance: toNum(metrics.cashBalance),
        totalReturn: toNum(metrics.totalReturn),
        totalReturnPercent: toNum(metrics.totalReturnPercent),
        currentGain: toNum(metrics.currentGain),
        winRate: toNum(metrics.winRate),
        avgWinPercent: toNum(metrics.avgWinPercent),
        avgLossPercent: toNum(metrics.avgLossPercent),
        maxDrawdown: toNum(metrics.maxDrawdown),
        totalTrades: toNum(metrics.totalTrades),
        winningTrades: toNum(metrics.winningTrades),
        losingTrades: toNum(metrics.losingTrades),
        activePositions: toNum(metrics.activePositions),
        positions: [],
      };
    });

    // Investments : on dérive des Orders récentes (structure minimaliste)
    const investments = profile.Order.slice(-20)
      .reverse()
      .map((o) => ({
        id: o.orderId,
        investorId: profile.id,
        coinId: o.symbol,
        symbol: o.symbol,
        timestamp: o.createdAt.toISOString(),
      }));

    // Dernières exécutions (investor-symbol)
    const execRows = await prisma.investorSymbolExecution.findMany({
      where: { profileId: profile.id },
    });
    const execMap = new Map<string, string>();
    let latestExec: string | null = null;
    for (const r of execRows) {
      const iso = r.lastExecutedAt.toISOString();
      execMap.set(r.symbol, iso);
      if (!latestExec || iso > latestExec) latestExec = iso;
    }

    // Enrichir positions / investments avec lastExecutedAt si disponible
    const positionsWithExec: any[] = [];
    const investmentsWithExec = investments.map((i) => ({
      ...i,
      lastExecutedAt: execMap.get(i.symbol) || null,
    }));

    const executions = Array.from(execMap.entries()).map(
      ([symbol, lastExecutedAt]) => ({ symbol, lastExecutedAt })
    );

    return {
      id: profile.id,
      name: profile.name,
      type: profile.type,
      riskTolerance: profile.riskTolerance ?? 0,
      maxPositionSize: profile.maxPositionSize ?? 0,
      holdingPeriod: 0,
      sellThreshold: 0,
      stopLoss: 0,
      sentimentWeight: 0,
      technicalWeight: 0,
      description: profile.strategyName,
      initialBalance,
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      investments: investmentsWithExec,
      portfolioSnapshots: [currentSnapshot, ...historical],
      openPositions: positionsDetail,
      ...(debug
        ? {
            priceDebug: allBaseSymbols.map((b) => ({
              base: b,
              price: priceMap.get(b) ?? null,
            })),
          }
        : {}),
      lastExecutions: executions,
      lastExecutedAt: latestExec,
    };
  },
});
