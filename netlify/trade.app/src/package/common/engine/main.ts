import { PrismaClient } from "@prisma/client";
import { SecondaryAccountConfig } from "../Config";
import { CandlestickIntervalEnum } from "../MapperType";
import { FutureInvestorCandle } from "../../future/investor/FutureInvestorCandle";
import { TradingEngine, MixHoldSideEnum, OrderSideEnum, type Order, type Position } from "./index";

function normalizeSide(v: any): OrderSideEnum | null {
  if (v == null) return null;
  const s = String(v).toLowerCase();
  if (s === "buy" || s === "b" || s === "long" || s === "open_long")
    return OrderSideEnum.BUY;
  if (s === "sell" || s === "s" || s === "short" || s === "open_short")
    return OrderSideEnum.SELL;
  return null;
}

function normalizePosSide(
  v: any,
  fallbackFromSide?: OrderSideEnum
): MixHoldSideEnum | null {
  if (v != null) {
    const s = String(v).toLowerCase();
    if (s.includes("long")) return MixHoldSideEnum.LONG;
    if (s.includes("short")) return MixHoldSideEnum.SHORT;
  }
  if (fallbackFromSide) {
    // heuristique: BUY -> LONG, SELL -> SHORT
    return fallbackFromSide === OrderSideEnum.BUY
      ? MixHoldSideEnum.LONG
      : MixHoldSideEnum.SHORT;
  }
  return null;
}

async function main() {
  // Prisma
  const prisma = new PrismaClient();
  // Market data via candles
  const cfg = SecondaryAccountConfig.SECOND_DEFAULT_CONFIG();
  const md = new FutureInvestorCandle(cfg);

  const ordersRaw = await loadOrders(prisma);

  if (!ordersRaw.length) {
    console.warn("Aucun ordre trouvé.");
    await prisma.$disconnect();
    return;
  }

  const { groups, allSymbols } = groupByInvestor(ordersRaw);
  if (groups.size === 0) {
    console.warn("Aucun ordre exploitable après normalisation.");
    await prisma.$disconnect();
    return;
  }

  const live = await fetchLivePrices(md, allSymbols);
  for (const [profileId, { name: profileName, orders }] of groups) {
    await processInvestor(prisma, profileId, profileName, orders, live);
  }

  await prisma.$disconnect();
}

function printInvestorHeader(name: string, id: string) {
  console.log("\n" + "=".repeat(80));
  console.log(`Investor: ${name} (${id})`);
  console.log("=".repeat(80));
}

function printPositions(positions: Position[]) {
  if (!positions.length) {
    console.log("Aucune position ouverte détectée.");
    return;
  }
  console.log(`\nPositions (${positions.length})`);
  for (const p of positions) {
    const side = p.posSide;
    console.log(
      [
        `${p.symbol} ${side}`,
        `size=${p.size}`,
        `entry=${p.entryPrice}`,
        `current=${p.currentPrice}`,
        `PnL=${p.pnlUnrealized.toFixed(2)}`,
        `fee=${p.totalFee}`,
        `liq=${p.liquidationPrice.toFixed(2)}`,
        `margin=${p.marginRequired.toFixed(2)}`,
        `opened=${p.openedAt?.toISOString() ?? "n/a"}`,
      ].join(" | ")
    );
  }
}

main().catch((err) => {
  console.error("Erreur main:", err);
  process.exitCode = 1;
});

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [] as string[];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (sec && parts.length < 2) parts.push(`${sec}s`);
  return parts.join(" ") || "0s";
}

// --- helpers ---
async function loadOrders(prisma: PrismaClient) {
  return prisma.order.findMany({
    orderBy: [{ profileId: "asc" }, { createdAt: "asc" }],
    select: {
      orderId: true,
      profileId: true,
      symbol: true,
      side: true,
      posSide: true,
      size: true,
      baseVolume: true,
      priceAvg: true,
      fee: true,
      createdAt: true,
      profile: { select: { name: true } },
    },
  });
}

function groupByInvestor(ordersRaw: Awaited<ReturnType<typeof loadOrders>>): {
  groups: Map<string, { name: string; orders: Order[] }>;
  allSymbols: string[];
} {
  const groups = new Map<string, { name: string; orders: Order[] }>();
  const allSymbolsSet = new Set<string>();
  for (const r of ordersRaw) {
    const side = normalizeSide(r.side);
    const posSide = normalizePosSide(r.posSide, side || undefined);
    if (!side || !posSide) continue;

    let sizeNum = Number(r.size);
    if (!Number.isFinite(sizeNum) || sizeNum === 0) sizeNum = Number(r.baseVolume);
    const priceNum = Number(r.priceAvg);
    const feeNum = Number(r.fee);
    const created = new Date(r.createdAt);
    if (!Number.isFinite(sizeNum) || !Number.isFinite(priceNum) || isNaN(created.getTime())) continue;

    const ord: Order = {
      id: String(r.orderId ?? `${r.symbol}-${r.createdAt.toISOString()}`),
      symbol: String(r.symbol),
      side,
      posSide,
      size: sizeNum,
      priceAvg: priceNum,
      fee: Number.isFinite(feeNum) ? feeNum : 0,
      createdAt: created,
    };
    const profileId = r.profileId;
    const profileName = r.profile?.name ?? r.profileId;
    if (!groups.has(profileId)) groups.set(profileId, { name: profileName, orders: [] });
    groups.get(profileId)!.orders.push(ord);
    allSymbolsSet.add(ord.symbol);
  }
  return { groups, allSymbols: Array.from(allSymbolsSet) };
}

async function fetchLivePrices(
  md: FutureInvestorCandle,
  allSymbols: string[]
): Promise<Record<string, number>> {
  const live: Record<string, number> = {};
  await Promise.all(
    allSymbols.map(async (s) => {
      const candles = await md.getCandles(s, CandlestickIntervalEnum.HOURLY, new Date(), 1);
      const p = candles?.length ? Number(candles[candles.length - 1].close) : NaN;
      if (Number.isFinite(p)) live[s.toUpperCase()] = p as number;
    })
  );
  return live;
}

async function processInvestor(
  prisma: PrismaClient,
  profileId: string,
  profileName: string,
  orders: Order[],
  live: Record<string, number>
) {
  const symbols = Array.from(new Set(orders.map((o) => o.symbol)));
  const currentPrices: Record<string, number> = {};
  for (const s of symbols) {
    const p = live[s.toUpperCase()];
    if (Number.isFinite(p)) currentPrices[s] = p;
  }
  for (const o of orders) if (!currentPrices[o.symbol]) currentPrices[o.symbol] = o.priceAvg;

  const engine = new TradingEngine(orders, 10);
  const positions: Position[] = engine.rebuildAllPositions(currentPrices);
  positions.sort((a, b) => b.pnlUnrealized - a.pnlUnrealized);

  printInvestorHeader(profileName, profileId);
  printPositions(positions);

  const stats = engine.getPortfolioStats(currentPrices);
  console.log(
    [
      `Résumé => positions=${stats.countPositions}`,
      `long=${stats.longCount}`,
      `short=${stats.shortCount}`,
      `PnL_latent=${stats.totalUnrealizedPnL.toFixed(2)}`,
      `frais_ouverts=${stats.totalFeesOpen.toFixed(2)}`,
      `notional=${stats.totalNotional.toFixed(2)}`,
      `margin=${stats.totalMargin.toFixed(2)}`,
    ].join(" | ")
  );

  const realized = engine.getRealizedPnLStats();
  const winRatePct = (realized.winRate * 100).toFixed(1) + "%";
  console.log(
    [
      `Réalisé => trades=${realized.tradeCount}`,
      `win=${realized.winCount}`,
      `loss=${realized.lossCount}`,
      `winrate=${winRatePct}`,
      `pnl=${realized.totalRealizedPnL.toFixed(2)}`,
      `best=${realized.best.toFixed(2)}`,
      `worst=${realized.worst.toFixed(2)}`,
      `avgHold=${formatDuration(realized.avgHoldMs)}`,
    ].join(" | ")
  );

  const closedTrades = engine.getClosedTrades();
  if (closedTrades.length) {
    for (const t of closedTrades) {
      const lastCloseOrderId = t.lastCloseOrderId ?? `${profileId}-${t.symbol}-${t.posSide}-${t.closedAt.toISOString()}`;
      await prisma.closedPosition.upsert({
        where: { lastCloseOrderId },
        create: {
          lastCloseOrderId,
          profileId,
          symbol: t.symbol,
          holdSide: t.posSide === MixHoldSideEnum.LONG ? "long" : "short",
          size: t.size,
          grossPnl: t.grossPnl,
          feesOpenUsed: t.feesOpenUsed,
          feesClose: t.feesClose,
          realizedPnl: t.realizedPnl,
          openedAt: t.openedAt,
          closedAt: t.closedAt,
        },
        update: {
          profileId,
          symbol: t.symbol,
          holdSide: t.posSide === MixHoldSideEnum.LONG ? "long" : "short",
          size: t.size,
          grossPnl: t.grossPnl,
          feesOpenUsed: t.feesOpenUsed,
          feesClose: t.feesClose,
          realizedPnl: t.realizedPnl,
          openedAt: t.openedAt,
          closedAt: t.closedAt,
        },
      });
    }
    console.log(`Positions fermées persistées: ${closedTrades.length}`);
  }
}

// Fonctions d'upsert Position/Open supprimées (table absente du schéma actuel).
