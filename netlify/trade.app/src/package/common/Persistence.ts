import { Prisma, PrismaClient, InvestorProfile, Order as PrismaOrder, ClosedPosition } from "@prisma/client";

// ---------------------------------------------------------------------------
// Prisma singleton
// ---------------------------------------------------------------------------
interface GlobalWithPrisma { __PRISMA_SINGLETON__?: PrismaClient }
const g = globalThis as GlobalWithPrisma;
export const prisma: PrismaClient = g.__PRISMA_SINGLETON__ || new PrismaClient();
g.__PRISMA_SINGLETON__ = prisma;

// ---------------------------------------------------------------------------
// Types d’E/S pour ce repository (CRUD uniquement)
// ---------------------------------------------------------------------------
export type PersistOrderContext = {
  investorId: string;
  symbol: string;
  side: string; // "buy" | "sell" | "flat"
  posSide: string; // "long" | "short"
  currentPrice?: number;
  rawOrder?: Record<string, unknown>;
  lastOrder?: Record<string, unknown>;
};

export type PersistPositionsContext = {
  investor: InvestorProfile;
  symbol: string;
  // Carte optionnelle pour DEV: { long: {...}, short: {...} }
  positions?: Record<string, unknown>;
  meta?: { leverage?: number; marginMode?: string; marginCoin?: string };
};

// ---------------------------------------------------------------------------
// Investors (CRUD)
// ---------------------------------------------------------------------------
export const InvestorsRepo = {
  async getById(id: string): Promise<InvestorProfile | null> {
    return prisma.investorProfile.findUnique({ where: { id } });
  },
  async listActive(): Promise<InvestorProfile[]> {
    return prisma.investorProfile.findMany({ where: { isActive: true } });
  },
};

// ---------------------------------------------------------------------------
// Orders (CRUD)
// ---------------------------------------------------------------------------
export const OrdersRepo = {
  async upsert(ctx: PersistOrderContext): Promise<void> {
    const o = ctx.rawOrder || ctx.lastOrder || {};
    const rawPayload: Prisma.InputJsonValue = JSON.parse(JSON.stringify(o));
    const orderId =
      (o as any).orderId || (o as any).id || `${ctx.investorId}-${Date.now()}`;
    const clientOid = (o as any).clientOid || (o as any).clientOrderId || `c-${orderId}`;
    const sizeNum = Number((o as any).size || (o as any).executedSize || (o as any).qty || (o as any).baseSize || 0);
    const priceAvgNum = Number((o as any).priceAvg || (o as any).price || ctx.currentPrice || 0);
    const baseVolumeNum = Number((o as any).baseVolume ?? sizeNum);
    const quoteVolumeNum = (o as any).quoteVolume != null ? Number((o as any).quoteVolume) : priceAvgNum * sizeNum;
    const side = String((o as any).side || ctx.side || "").toLowerCase();
    const posSide = String((o as any).posSide || ctx.posSide || "").toLowerCase();

    await prisma.order.upsert({
      where: { orderId: String(orderId) },
      update: {
        profileId: ctx.investorId,
        symbol: ctx.symbol,
        size: new Prisma.Decimal(sizeNum || 0),
        clientOid: String(clientOid),
        baseVolume: new Prisma.Decimal(baseVolumeNum || 0),
        priceAvg: new Prisma.Decimal(priceAvgNum || 0),
        quoteVolume: new Prisma.Decimal(quoteVolumeNum || 0),
        side,
        posSide,
        rawPayload,
      },
      create: {
        orderId: String(orderId),
        profileId: ctx.investorId,
        symbol: ctx.symbol,
        size: new Prisma.Decimal(sizeNum || 0),
        clientOid: String(clientOid),
        baseVolume: new Prisma.Decimal(baseVolumeNum || 0),
        priceAvg: new Prisma.Decimal(priceAvgNum || 0),
        quoteVolume: new Prisma.Decimal(quoteVolumeNum || 0),
        side,
        posSide,
        rawPayload,
      },
    });
  },

  async listByProfileSymbolPosSide(
    profileId: string,
    symbol: string,
    posSide: string
  ): Promise<PrismaOrder[]> {
    return prisma.order.findMany({
      where: { profileId, symbol, posSide: posSide.toLowerCase() },
      orderBy: { createdAt: "asc" },
      take: 5000,
    });
  },

  async listByProfile(profileId: string): Promise<PrismaOrder[]> {
    return prisma.order.findMany({
      where: { profileId },
      orderBy: { createdAt: "asc" },
    });
  },

  async listByProfileAndSymbol(
    profileId: string,
    symbol: string,
    limit = 50
  ): Promise<PrismaOrder[]> {
    return prisma.order.findMany({
      where: { profileId, symbol },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async findLastByProfileSymbol(profileId: string, symbol: string): Promise<PrismaOrder | null> {
    return prisma.order.findFirst({
      where: { profileId, symbol },
      orderBy: { createdAt: "desc" },
    });
  },
};

// ---------------------------------------------------------------------------
// ClosedPositions (CRUD)
// ---------------------------------------------------------------------------
export const ClosedPositionsRepo = {
  async upsertMany(profileId: string, items: Array<Omit<ClosedPosition, "id" | "createdAt" | "updatedAt"> & { lastCloseOrderId?: string | null }>): Promise<void> {
    for (const it of items) {
      const key = it.lastCloseOrderId ?? null;
      if (!key) {
        // pas de clé d’upsert sûre -> on insert simple
        await prisma.closedPosition.create({ data: { ...it } as any });
        continue;
      }
      await prisma.closedPosition.upsert({
        where: { lastCloseOrderId: key },
        create: { ...it } as any,
        update: { ...it } as any,
      });
    }
  },
};

// ---------------------------------------------------------------------------
// API publique simple (compat existante)
// - Ne contient AUCUNE logique métier; seulement des opérations données.
// ---------------------------------------------------------------------------
export type OrderContext = {
  investor: InvestorProfile;
  symbol: string;
  side: string; // "buy" | "sell" | "flat"
  posSide: string; // "long" | "short"
  currentPrice?: number;
  rawOrder?: Record<string, unknown>;
  lastOrder?: Record<string, unknown>;
};

export async function persistOrder(ctx: OrderContext): Promise<void> {
  await OrdersRepo.upsert({
    investorId: ctx.investor.id,
    symbol: ctx.symbol,
    side: ctx.side,
    posSide: ctx.posSide,
    currentPrice: ctx.currentPrice,
    rawOrder: ctx.rawOrder,
    lastOrder: ctx.lastOrder,
  });
}

// DEV only – plus de table Position dans le schéma actuel.
// On marque juste l’exécution pour (investor, symbol).
export async function persistPositions(
  investor: InvestorProfile,
  symbol: string,
  _positions?: Record<string, unknown>,
  _meta?: { leverage?: number; marginMode?: string; marginCoin?: string }
): Promise<void> {
  await prisma.investorSymbolExecution.upsert({
    where: { profileId_symbol: { profileId: investor.id, symbol } },
    create: { profileId: investor.id, symbol },
    update: { lastExecutedAt: new Date() },
  });
}

