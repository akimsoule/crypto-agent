import { endpoint, json } from "./_lib/middleware.mts";
import { InvestorEngineService } from "../trade.app/src/package/common/engine/InvestorEngineService";
import { SecondaryAccountConfig } from "../trade.app/src/package/common/Config";
import { FutureInvestorCandle } from "../trade.app/src/package/future/investor/FutureInvestorCandle";
import {
  baseFromSymbol,
  computeUnrealized,
  getPriceMap,
  reconstructStates,
  buildPositionsDetail,
  toNum,
} from "./_lib/pnl.mts";
import type { OrderLite } from "./_lib/pnl.mts";

// Types locaux pour refléter les sélections Prisma et gérer Decimal
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
  leverage?: number | null;
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
    const id = url.searchParams.get("id");
    const sideParam = (url.searchParams.get("side") || "").toLowerCase();
    const debug =
      url.searchParams.get("debug") === "1" ||
      url.searchParams.get("debug") === "true";
    const engineParam = url.searchParams.get("engine") === "1";
    const onlySide =
      sideParam === "long" || sideParam === "short"
        ? (sideParam as "long" | "short")
        : undefined;
    if (!id) return json({ success: false, error: "Param id requis" }, 400);

    // Récupération du profil + relations nécessaires
    const profileRaw = await prisma.investorProfile.findUnique({
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
      },
    });
    const profile = profileRaw as unknown as ProfileWithOrders | null;

    if (!profile)
      return json({ success: false, error: "Investor introuvable" }, 404);

    // Reconstruire les positions ouvertes à partir des ORDERS (lissage) et calculer via mark price
    const allBaseSymbols: string[] = Array.from(
      new Set(
        (profile?.Order ?? []).map((o: { symbol: string }) =>
          baseFromSymbol(o.symbol)
        )
      )
    );
    const priceMap = await getPriceMap(allBaseSymbols, { ttlMs: 15_000 });
    const states = reconstructStates(
      (profile?.Order ?? []) as unknown as OrderLite[],
      {
        onlySide,
      }
    );
    const { totalUnrealized, activePositions } = computeUnrealized(
      states,
      priceMap,
      { onlySide }
    );
    const positionsDetail = buildPositionsDetail(states, priceMap, {
      onlySide,
    });
    // Valeur approximative: balance initiale + PnL latent (en attendant un suivi de balance réel)
    const initialBalance = toNum(profile.initialBalance ?? 0);
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

    // ==== Réalisé & gain total (basé sur closedPosition + currentBalance si disponible) ====
    let realizedTotal = 0;
    try {
      const agg = await prisma.closedPosition.aggregate({
        _sum: { realizedPnl: true },
        where: { profileId: profile.id },
      });
      realizedTotal = Number(agg._sum.realizedPnl || 0);
    } catch (e) {
      if (debug)
        console.warn(
          "[investorDetail] aggregate closedPosition failed",
          (e as Error).message
        );
    }
    // Essayer de récupérer currentBalance (champ ajouté)
    let currentBalanceDb: number | null = null;
    try {
      const balRow = await prisma.investorProfile.findUnique({
        where: { id: profile.id },
        select: { currentBalance: true, initialBalance: true },
      });
      if (balRow?.currentBalance != null)
        currentBalanceDb = Number(balRow.currentBalance);
    } catch {}
    let inferredTotalGain: number;
    if (currentBalanceDb != null) {
      inferredTotalGain = currentBalanceDb - initialBalance;
    } else {
      const latent = activePositions > 0 ? totalUnrealized : 0;
      inferredTotalGain = realizedTotal + latent;
    }

    // Adaptation des snapshots historiques si des métriques sont présentes
    const historical: any[] = [];

    // Investments : on dérive des Orders récentes (structure minimaliste)
    const investments = profile.Order.slice(-20)
      .reverse()
      .map((o: { orderId: string; symbol: string; createdAt: Date }) => ({
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
    const investmentsWithExec = investments.map((i: { symbol: string }) => ({
      ...i,
      lastExecutedAt: execMap.get(i.symbol) || null,
    }));

    const executions = Array.from(execMap.entries()).map(
      ([symbol, lastExecutedAt]) => ({ symbol, lastExecutedAt })
    );

    // Optionnel: calcul via TradingEngine si demandé (engine=1)
    let engine: any = undefined;
    if (engineParam) {
      try {
        const cfg = SecondaryAccountConfig.SECOND_DEFAULT_CONFIG();
        const candle = new FutureInvestorCandle(cfg);
        const svc = new InvestorEngineService(candle);
        const snap = await svc.snapshot(profile.id, profile.leverage ?? 10);
        engine = {
          positions: snap.positions,
          portfolio: snap.portfolio,
          realized: snap.realized,
        };
      } catch (e) {
        console.warn(
          "[investorDetail] engine snapshot failed",
          (e as Error).message
        );
      }
    }

    return {
      id: profile.id,
      name: profile.name,
      type: profile.type,
      riskTolerance: toNum(profile.riskTolerance ?? 0),
      maxPositionSize: toNum(profile.maxPositionSize ?? 0),
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
      realizedPnlTotal: realizedTotal,
      totalGain: inferredTotalGain,
      totalGainPercent:
        initialBalance > 0 ? (inferredTotalGain / initialBalance) * 100 : 0,
      currentBalance: ((): number => {
        if (currentBalanceDb != null) return currentBalanceDb;
        const latent = activePositions > 0 ? totalUnrealized : 0;
        return initialBalance + realizedTotal + latent;
      })(),
      ...(engine ? { engine } : {}),
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
