#!/usr/bin/env tsx
import { prisma } from "../netlify/trade.app/src/package/common/Persistence";
import {
  TradingEngine,
  MixHoldSideEnum as EngineHoldSideEnum,
  OrderSideEnum as EngineOrderSideEnum,
  type Order as EngineOrder,
} from "../netlify/trade.app/src/package/common/engine/engine";

async function rebuild() {
  console.log("[rebuild-balances] Start");
  const targetId = process.env.INVESTOR_ID;
  const investors = targetId
    ? await prisma.investorProfile.findMany({ where: { id: targetId } })
    : await prisma.investorProfile.findMany();
  if (targetId && investors.length === 0) {
    console.warn(`[rebuild-balances] INVESTOR_ID=${targetId} introuvable`);
    return;
  }
  for (const inv of investors) {
    const orders = await prisma.order.findMany({
      where: { profileId: inv.id },
      orderBy: { createdAt: "asc" },
    });
    if (!orders.length) {
      // seed balance si vide
      if (
        (inv as any).currentBalance === null ||
        Number(inv.currentBalance) === 0
      ) {
        await prisma.investorProfile.update({
          where: { id: inv.id },
          data: { currentBalance: inv.initialBalance },
        });
      }
      continue;
    }
    const engineOrders: EngineOrder[] = orders.map((o) => ({
      id: o.orderId,
      symbol: o.symbol,
      side:
        String(o.side).toLowerCase() === "sell"
          ? EngineOrderSideEnum.SELL
          : EngineOrderSideEnum.BUY,
      posSide: String(o.posSide).toLowerCase().includes("short")
        ? EngineHoldSideEnum.SHORT
        : EngineHoldSideEnum.LONG,
      size: Number(o.size),
      priceAvg: Number(o.priceAvg),
      fee: Number(o.fee || 0),
      createdAt: o.createdAt,
    }));

    const engine = new TradingEngine(engineOrders, Number(inv.leverage || 1));
    const realized = engine.getRealizedPnLStats();

    const newBalance =
      Number(inv.initialBalance || 0) + realized.totalRealizedPnL;
    await prisma.investorProfile.update({
      where: { id: inv.id },
      data: { currentBalance: newBalance },
    });

    // Persister les closed trades et collecter les ordres totalement consommés (rounds fermés)
    const closed = engine.getClosedTrades();
    for (const ct of closed) {
      const lastCloseOrderId =
        ct.lastCloseOrderId ||
        `${inv.id}-${ct.symbol}-${ct.posSide}-${ct.closedAt.toISOString()}`;
      try {
        await prisma.closedPosition.upsert({
          where: { lastCloseOrderId },
          update: {
            profileId: inv.id,
            symbol: ct.symbol,
            holdSide: ct.posSide === EngineHoldSideEnum.LONG ? "long" : "short",
            size: ct.size,
            grossPnl: ct.grossPnl,
            realizedPnl: ct.realizedPnl,
            feesOpenUsed: ct.feesOpenUsed,
            feesClose: ct.feesClose,
            openedAt: ct.openedAt,
            closedAt: ct.closedAt,
          },
          create: {
            lastCloseOrderId,
            profileId: inv.id,
            symbol: ct.symbol,
            holdSide: ct.posSide === EngineHoldSideEnum.LONG ? "long" : "short",
            size: ct.size,
            grossPnl: ct.grossPnl,
            realizedPnl: ct.realizedPnl,
            feesOpenUsed: ct.feesOpenUsed,
            feesClose: ct.feesClose,
            openedAt: ct.openedAt,
            closedAt: ct.closedAt,
          },
        });
      } catch (e) {
        console.warn("[rebuild-balances] closedPosition upsert failed", e);
      }
    }

    // Suppression des ordres complètement fermés:
    // Stratégie simple: si un symbole+posSide n'a plus de position ouverte dans engine, supprimer ses ordres.
    const stillOpen = new Set(
      engine.rebuildAllPositions({}).map((p) => `${p.symbol}|${p.posSide}`)
    );
    const deletableGroups = new Map<string, string[]>();
    for (const o of orders) {
      const key = `${o.symbol}|${o.posSide}`;
      if (!stillOpen.has(key)) {
        const arr = deletableGroups.get(key) || [];
        arr.push(o.orderId);
        deletableGroups.set(key, arr);
      }
    }
    for (const ids of deletableGroups.values()) {
      if (ids.length) {
        await prisma.order.deleteMany({ where: { orderId: { in: ids } } });
      }
    }

    console.log(
      `[rebuild-balances] Investor ${inv.name} -> balance=${newBalance.toFixed(2)} closedTrades=${closed.length}`
    );
  }
  console.log("[rebuild-balances] Done");
}

rebuild()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
