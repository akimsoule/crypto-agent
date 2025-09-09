import { PrismaClient, InvestorProfile } from "@prisma/client";
import { JSONObject, MixHoldSideEnum } from "./MapperType";

// Garde: aucune persistance en mode production.
// La persistance (orders/positions) est réservée au mode DEV pour les investisseurs fictifs.
const IS_PROD = process.env.APP_ENV === 'production';

// Singleton Prisma
interface GlobalWithPrisma {
  __PRISMA_SINGLETON__?: PrismaClient;
}
const g = globalThis as GlobalWithPrisma;
export const prisma: PrismaClient = g.__PRISMA_SINGLETON__ || new PrismaClient();
g.__PRISMA_SINGLETON__ = prisma;

export type OrderContext = {
  investor: InvestorProfile;
  symbol: string;
  side: string; // buy/sell/flat
  posSide: MixHoldSideEnum;
  currentPrice: number;
  rawOrder?: JSONObject;
  lastOrder?: JSONObject;
};

export async function persistOrder(ctx: OrderContext) {
  if (IS_PROD) {
    // Pas de persistance en prod
    return;
  }
  const o = ctx.rawOrder || ctx.lastOrder || ({} as JSONObject);
  const orderId = (o.orderId as string) || (o.id as string) || `${ctx.investor.id}-${Date.now()}`;
  const clientOid = (o.clientOid as string) || (o.clientOrderId as string) || `c-${orderId}`;
  const size = String(o.size || o.executedSize || o.qty || o.baseSize || 0);
  const priceAvg = String(o.priceAvg || o.price || ctx.currentPrice || 0);
  const baseVolume = String(o.baseVolume || size);
  const quoteVolume = String((o.quoteVolume as string) || (Number(priceAvg) * Number(size) || 0));
  const side = (o.side as string) || ctx.side;
  const posSide = (o.posSide as string) || ctx.posSide.toLowerCase();
  try {
    await prisma.order.upsert({
      where: { orderId },
      update: {
        profileId: ctx.investor.id,
        symbol: ctx.symbol,
        size,
        clientOid,
        baseVolume,
        priceAvg,
        quoteVolume,
        side,
        posSide,
        rawPayload: o,
      },
      create: {
        orderId,
        profileId: ctx.investor.id,
        symbol: ctx.symbol,
        size,
        clientOid,
        baseVolume,
        priceAvg,
        quoteVolume,
        side,
        posSide,
        rawPayload: o,
      },
    });
  } catch (e) {
    console.error("persistOrder error", e);
  }
}

export async function persistPositions(
  investor: InvestorProfile,
  symbol: string,
  positions: { [k in MixHoldSideEnum]?: JSONObject },
  meta: { marginMode?: string; leverage?: number; marginCoin?: string }
) {
  if (IS_PROD) {
    return; // Pas de persistance en prod
  }
  for (const side of Object.keys(positions) as MixHoldSideEnum[]) {
    const p = positions[side];
    if (!p || Object.keys(p).length === 0) {
      await prisma.position.deleteMany({
        where: { profileId: investor.id, symbol, holdSide: side.toLowerCase() },
      });
      continue;
    }
    const leverage = String((p.openLeverage as string) || p.leverage || meta.leverage || 0);
    const openPriceAvg = String(
      p.openPriceAvg || p.averageOpenPrice || p.openPrice || p.entryPrice || 0
    );
    const marginSize = String(p.marginSize || p.margin || 0);
    const available = String(p.available || p.size || p.pos || 0);
    const locked = String(p.locked || 0);
    const unrealizedPL = String(p.unrealizedPL || p.unrealisedPnl || 0);
    const markPrice = String(p.markPrice || p.mark || openPriceAvg);
    try {
      await prisma.position.upsert({
        where: {
          profileId_symbol_holdSide: {
            profileId: investor.id,
            symbol,
            holdSide: side.toLowerCase(),
          },
        },
        update: {
          marginCoin: (p.marginCoin as string) || meta.marginCoin || "USDT",
          marginSize,
          available,
          locked,
          openPriceAvg,
          marginMode: (p.marginMode as string) || meta.marginMode || "crossed",
          unrealizedPL,
          markPrice,
          leverage,
          rawPayload: p,
        },
        create: {
          id: `${investor.id}-${symbol}-${side}`,
          profileId: investor.id,
          marginCoin: (p.marginCoin as string) || meta.marginCoin || "USDT",
          symbol,
          holdSide: side.toLowerCase(),
          marginSize,
          available,
          locked,
          openPriceAvg,
          marginMode: (p.marginMode as string) || meta.marginMode || "crossed",
          unrealizedPL,
          markPrice,
          leverage,
          rawPayload: p,
        },
      });
    } catch (e) {
      console.error("persistPositions error", e);
    }
  }
}
