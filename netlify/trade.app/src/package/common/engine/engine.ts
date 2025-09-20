export enum MixHoldSideEnum {
  LONG = "long",
  SHORT = "short",
}

export enum OrderSideEnum {
  BUY = "buy",
  SELL = "sell",
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSideEnum; // buy/sell
  posSide: MixHoldSideEnum; // long/short
  size: number; // quantité en base (ex: BTC)
  priceAvg: number; // prix d'exécution
  fee?: number; // frais payés (USDT)
  createdAt: Date;
}

export interface Position {
  symbol: string;
  posSide: MixHoldSideEnum;
  openSide: OrderSideEnum;
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnlUnrealized: number;
  totalFee: number;
  notionalValue: number;
  marginRequired: number;
  liquidationPrice: number;
  lastOrderId?: string;
  openedAt?: Date;
}

// Accumulateur interne pour construire une position DCA
type Acc = {
  symbol: string;
  posSide: MixHoldSideEnum;
  openSide: OrderSideEnum;
  qty: number; // taille ouverte restante
  avg: number; // prix d'entrée moyen de la portion restante
  fees: number; // frais attachés à la portion restante uniquement
  openedAt?: Date;
  lastOrderId?: string;
};

export interface PortfolioStats {
  positions: Position[];
  countPositions: number;
  longCount: number;
  shortCount: number;
  totalUnrealizedPnL: number;
  totalFeesOpen: number;
  totalNotional: number;
  totalMargin: number;
  bySymbol: Record<string, { notional: number; pnlUnrealized: number; size: number }>;
}

export interface RealizedPnLStats {
  totalRealizedPnL: number;
  totalFeesClosed: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRate: number; // 0..1
  avgProfit: number; // par trade clôturé
  best: number;
  worst: number;
  avgHoldMs: number; // durée moyenne de détention sur trades clôturés
}

export interface ClosedTrade {
  symbol: string;
  posSide: MixHoldSideEnum;
  size: number; // taille totale clôturée (round)
  realizedPnl: number; // net (gross - fees)
  grossPnl: number;
  feesOpenUsed: number; // part des frais d'ouverture affectée à cette clôture
  feesClose: number; // somme des fees de fermeture
  openedAt: Date;
  closedAt: Date;
  lastCloseOrderId?: string;
}

export class TradingEngine {
  private readonly leverage: number;
  private readonly orders: Order[];

  constructor(orders: Order[] = [], leverage: number = 1) {
    this.orders = orders;
    this.leverage = leverage;
  }

  /**
   * Ajoute un ordre dans l’historique (in-memory)
   */
  addOrder(order: Order) {
    this.orders.push(order);
    this.orders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Reconstitue la position nette (tous ordres inclus) pour un symbole et un sens
   */
  getPosition(symbol: string, posSide: MixHoldSideEnum, currentPrice: number): Position | null {
    const byKey = new Map<string, Acc>();
    const filtered = this.orders.filter(
      (o) => o.symbol === symbol && o.posSide === posSide
    );
    const chrono = this.sortOrdersChronologically(filtered);
    for (const o of chrono) this.applyOrderDca(byKey, o);

    const key = `${symbol}|${posSide}`;
    const acc = byKey.get(key);
    if (!acc || acc.qty <= 0) return null;

    const entryPrice = acc.avg;
    const pnlDiff =
      posSide === MixHoldSideEnum.LONG
        ? currentPrice - entryPrice
        : entryPrice - currentPrice;
    const pnlUnrealized = pnlDiff * acc.qty - acc.fees;
    const notionalValue = acc.qty * currentPrice;
    const marginRequired = this.leverage > 0 ? notionalValue / this.leverage : notionalValue;
    const liquidationPrice = this.calculateLiquidationPrice(
      entryPrice,
      acc.qty,
      posSide,
      marginRequired,
      acc.fees
    );

    return {
      symbol,
      posSide,
      openSide: acc.openSide,
      size: acc.qty,
      entryPrice,
      currentPrice,
      pnlUnrealized,
      totalFee: acc.fees,
      notionalValue,
      marginRequired,
      liquidationPrice,
      lastOrderId: acc.lastOrderId,
      openedAt: acc.openedAt,
    };
  }

  /**
   * Liquidation approximative (simplifiée)
   */
  private calculateLiquidationPrice(
    entryPrice: number,
    size: number,
    posSide: MixHoldSideEnum,
    margin: number,
    fees: number
  ): number {
    if (size <= 0 || entryPrice <= 0) return 0;

    const equity = margin - fees;
    if (equity <= 0) return 0;

    const maxLossPerUnit = equity / size;

    return posSide === MixHoldSideEnum.LONG
      ? entryPrice - maxLossPerUnit
      : entryPrice + maxLossPerUnit;
  }

  /**
   * Reconstruit toutes les positions par symbole et par sens
   */
  rebuildAllPositions(currentPrices: Record<string, number>): Position[] {
    const byKey = new Map<string, Acc>();

    const ordersChrono = this.sortOrdersChronologically(this.orders);
    for (const o of ordersChrono) this.applyOrderDca(byKey, o);

    return this.buildPositionsFromAcc(byKey, currentPrices);
  }

  /** Agrégats de portefeuille sur les positions ouvertes */
  getPortfolioStats(currentPrices: Record<string, number>): PortfolioStats {
    const positions = this.rebuildAllPositions(currentPrices);
    let totalUnrealizedPnL = 0;
    let totalFeesOpen = 0;
    let totalNotional = 0;
    let totalMargin = 0;
    let longCount = 0;
    let shortCount = 0;
    const bySymbol: Record<string, { notional: number; pnlUnrealized: number; size: number }>= {};
    for (const p of positions) {
      totalUnrealizedPnL += p.pnlUnrealized;
      totalFeesOpen += p.totalFee;
      totalNotional += p.notionalValue;
      totalMargin += p.marginRequired;
      if (p.posSide === MixHoldSideEnum.LONG) longCount++; else shortCount++;
      const b = (bySymbol[p.symbol] ??= { notional: 0, pnlUnrealized: 0, size: 0 });
      b.notional += p.notionalValue;
      b.pnlUnrealized += p.pnlUnrealized;
      b.size += p.size;
    }
    return {
      positions,
      countPositions: positions.length,
      longCount,
      shortCount,
      totalUnrealizedPnL,
      totalFeesOpen,
      totalNotional,
      totalMargin,
      bySymbol,
    };
  }

  /** Statistiques de PnL réalisé (approx DCA) par trades clôturés */
  getRealizedPnLStats(): RealizedPnLStats {
    const groups = this.groupOrdersBySymbolSide(this.orders);

    let agg = {
      totalRealizedPnL: 0,
      totalFeesClosed: 0,
      tradeCount: 0,
      winCount: 0,
      lossCount: 0,
      best: Number.NEGATIVE_INFINITY,
      worst: Number.POSITIVE_INFINITY,
      holdSum: 0,
    };

    for (const list of groups.values()) {
      if (!list.length) continue;
      const posSide = list[0].posSide; // homogène par groupe
      const g = this.computeRealizedStatsForGroup(list, posSide);
      agg.totalRealizedPnL += g.totalRealizedPnL;
      agg.totalFeesClosed += g.totalFeesClosed;
      agg.tradeCount += g.tradeCount;
      agg.winCount += g.winCount;
      agg.lossCount += g.lossCount;
      if (g.best > agg.best) agg.best = g.best;
      if (g.worst < agg.worst) agg.worst = g.worst;
      agg.holdSum += g.holdSum;
    }

    const winRate = agg.tradeCount > 0 ? agg.winCount / agg.tradeCount : 0;
    const avgProfit = agg.tradeCount > 0 ? agg.totalRealizedPnL / agg.tradeCount : 0;
    const avgHoldMs = agg.tradeCount > 0 ? agg.holdSum / agg.tradeCount : 0;
    if (agg.best === Number.NEGATIVE_INFINITY) agg.best = 0;
    if (agg.worst === Number.POSITIVE_INFINITY) agg.worst = 0;
    return {
      totalRealizedPnL: agg.totalRealizedPnL,
      totalFeesClosed: agg.totalFeesClosed,
      tradeCount: agg.tradeCount,
      winCount: agg.winCount,
      lossCount: agg.lossCount,
      winRate,
      avgProfit,
      best: agg.best,
      worst: agg.worst,
      avgHoldMs,
    };
  }

  private groupOrdersBySymbolSide(orders: Order[]): Map<string, Order[]> {
    const out = new Map<string, Order[]>();
    const chrono = this.sortOrdersChronologically(orders);
    for (const o of chrono) {
      if (!o?.symbol || !o?.posSide || !o?.side) continue;
      const key = `${o.symbol}|${o.posSide}`;
      const arr = out.get(key);
      if (arr) arr.push(o); else out.set(key, [o]);
    }
    return out;
  }

  private computeRealizedStatsForGroup(list: Order[], posSide: MixHoldSideEnum) {
    let qty = 0;
    let avg = 0;
    let feesRemaining = 0;
    let roundPnL = 0;
    let openedAt: Date | undefined;

    let totalRealizedPnL = 0;
    let totalFeesClosed = 0;
    let tradeCount = 0;
    let winCount = 0;
    let lossCount = 0;
    let best = Number.NEGATIVE_INFINITY;
    let worst = Number.POSITIVE_INFINITY;
    let holdSum = 0;

    const openSide = this.openSideFor(posSide);
    for (const o of list) {
      const price = Number(o.priceAvg);
      const size = Number(o.size);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (!Number.isFinite(size) || size <= 0) continue;

      if (o.side === openSide) {
        const newQty = qty + size;
        avg = qty > 0 ? (avg * qty + price * size) / newQty : price;
        qty = newQty;
        feesRemaining += Number(o.fee || 0);
        openedAt ??= o.createdAt;
      } else if (qty > 0) {
        const closeSize = Math.min(qty, size);
        const pnlDiff = posSide === MixHoldSideEnum.LONG ? price - avg : avg - price;
        const realizedGross = pnlDiff * closeSize;
        const feesPart = qty > 0 ? feesRemaining * (closeSize / qty) : 0;
        const closeFee = Number(o.fee || 0);
        const realizedNet = realizedGross - feesPart - closeFee;

        roundPnL += realizedNet;
        totalFeesClosed += feesPart + closeFee;

        const remaining = qty - closeSize;
        feesRemaining = qty > 0 ? feesRemaining * (remaining / qty) : 0;
        qty = remaining;

        if (qty === 0) {
          tradeCount++;
          totalRealizedPnL += roundPnL;
          if (roundPnL > 0) winCount++; else if (roundPnL < 0) lossCount++;
          if (roundPnL > best) best = roundPnL;
          if (roundPnL < worst) worst = roundPnL;
          if (openedAt) holdSum += o.createdAt.getTime() - openedAt.getTime();
          avg = 0; feesRemaining = 0; roundPnL = 0; openedAt = undefined;
        }
      }
    }
    return { totalRealizedPnL, totalFeesClosed, tradeCount, winCount, lossCount, best, worst, holdSum };
  }

  /** Retourne la liste des trades clôturés (rounds) avec détail */
  getClosedTrades(): ClosedTrade[] {
    const groups = this.groupOrdersBySymbolSide(this.orders);
    const out: ClosedTrade[] = [];
    for (const list of groups.values()) {
      if (!list.length) continue;
      const posSide = list[0].posSide;
      out.push(...this.computeClosedTradesForGroup(list, posSide));
    }
    return out;
  }

  private computeClosedTradesForGroup(list: Order[], posSide: MixHoldSideEnum): ClosedTrade[] {
    const result: ClosedTrade[] = [];
    let qty = 0;
    let avg = 0;
    let feesRemaining = 0;
    let openedAt: Date | undefined;

    // accumulateurs sur le round courant
    let closedSizeSum = 0;
    let grossSum = 0;
    let feesOpenUsedSum = 0;
    let feesCloseSum = 0;
    let realizedSum = 0;
    let lastCloseOrderId: string | undefined;

    const openSide = this.openSideFor(posSide);
    for (const o of list) {
      const price = Number(o.priceAvg);
      const size = Number(o.size);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (!Number.isFinite(size) || size <= 0) continue;

      if (o.side === openSide) {
        // si un round précédent a fini et qu'on a ré-ouvert, les compteurs round doivent déjà être à 0
        const newQty = qty + size;
        avg = qty > 0 ? (avg * qty + price * size) / newQty : price;
        qty = newQty;
        feesRemaining += Number(o.fee || 0);
        openedAt ??= o.createdAt;
      } else if (qty > 0) {
        // fermeture
        const closeSize = Math.min(qty, size);
        const pnlDiff = posSide === MixHoldSideEnum.LONG ? price - avg : avg - price;
        const realizedGross = pnlDiff * closeSize;
        const feesPart = qty > 0 ? feesRemaining * (closeSize / qty) : 0;
        const closeFee = Number(o.fee || 0);
        const realizedNet = realizedGross - feesPart - closeFee;

        closedSizeSum += closeSize;
        grossSum += realizedGross;
        feesOpenUsedSum += feesPart;
        feesCloseSum += closeFee;
        realizedSum += realizedNet;
        lastCloseOrderId = o.id;

        const remaining = qty - closeSize;
        feesRemaining = qty > 0 ? feesRemaining * (remaining / qty) : 0;
        qty = remaining;

        if (qty === 0 && openedAt) {
          result.push({
            symbol: list[0].symbol,
            posSide,
            size: closedSizeSum,
            realizedPnl: realizedSum,
            grossPnl: grossSum,
            feesOpenUsed: feesOpenUsedSum,
            feesClose: feesCloseSum,
            openedAt,
            closedAt: o.createdAt,
            lastCloseOrderId,
          });
          // reset round accumulators
          avg = 0; feesRemaining = 0; openedAt = undefined; lastCloseOrderId = undefined;
          closedSizeSum = 0; grossSum = 0; feesOpenUsedSum = 0; feesCloseSum = 0; realizedSum = 0;
        }
      }
    }
    return result;
  }

  // --- Helpers DCA
  private sortOrdersChronologically(orders: Order[]): Order[] {
    return [...orders].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  private keyFor(o: Order): string {
    return `${o.symbol}|${o.posSide}`;
  }

  private openSideFor(posSide: MixHoldSideEnum): OrderSideEnum {
    return posSide === MixHoldSideEnum.LONG
      ? OrderSideEnum.BUY
      : OrderSideEnum.SELL;
  }

  private ensureAcc(byKey: Map<string, Acc>, o: Order): Acc {
    const key = this.keyFor(o);
    let acc = byKey.get(key);
    if (!acc) {
      acc = {
        symbol: o.symbol,
        posSide: o.posSide,
        openSide: this.openSideFor(o.posSide),
        qty: 0,
        avg: 0,
        fees: 0,
      };
      byKey.set(key, acc);
    }
    return acc;
  }

  private applyOrderDca(byKey: Map<string, Acc>, o: Order) {
    if (!o?.symbol || !o?.posSide || !o?.side) return;
    const price = Number(o.priceAvg);
    const size = Number(o.size);
    if (!Number.isFinite(price) || price <= 0) return;
    if (!Number.isFinite(size) || size <= 0) return;

    const acc = this.ensureAcc(byKey, o);
    const openSide = acc.openSide;

    if (o.side === openSide) {
      this.applyOpen(acc, size, price, o);
    } else if (acc.qty > 0) {
      this.applyClose(acc, size, o);
    }
  }

  private applyOpen(acc: Acc, size: number, price: number, o: Order) {
    const prevQty = acc.qty;
    const newQty = prevQty + size;
    acc.avg = prevQty > 0 ? (acc.avg * prevQty + price * size) / newQty : price;
    acc.qty = newQty;
    acc.fees += Number(o.fee || 0);
    acc.openedAt ??= o.createdAt;
    acc.lastOrderId = o.id;
  }

  private applyClose(acc: Acc, size: number, o: Order) {
    const prevQty = acc.qty;
    const closeSize = Math.min(prevQty, size);
    const remaining = prevQty - closeSize;
    acc.fees = prevQty > 0 ? acc.fees * (remaining / prevQty) : 0;
    acc.qty = remaining;
    if (acc.qty === 0) {
      acc.avg = 0;
      acc.openedAt = undefined;
    }
    acc.lastOrderId = o.id;
  }

  private buildPositionsFromAcc(
    byKey: Map<string, Acc>,
    currentPrices: Record<string, number>
  ): Position[] {
    const out: Position[] = [];
    for (const acc of byKey.values()) {
      if (acc.qty <= 0) continue;
      const currentPrice = Number(currentPrices[acc.symbol] || 0);
      const entryPrice = acc.avg;
      const pnlDiff =
        acc.posSide === MixHoldSideEnum.LONG
          ? currentPrice - entryPrice
          : entryPrice - currentPrice;
      const pnlUnrealized = pnlDiff * acc.qty - acc.fees;
      const notionalValue = acc.qty * currentPrice;
      const marginRequired =
        this.leverage > 0 ? notionalValue / this.leverage : notionalValue;
      const liquidationPrice = this.calculateLiquidationPrice(
        entryPrice,
        acc.qty,
        acc.posSide,
        marginRequired,
        acc.fees
      );
      out.push({
        symbol: acc.symbol,
        posSide: acc.posSide,
        openSide: acc.openSide,
        size: acc.qty,
        entryPrice,
        currentPrice,
        pnlUnrealized,
        totalFee: acc.fees,
        notionalValue,
        marginRequired,
        liquidationPrice,
        lastOrderId: acc.lastOrderId,
        openedAt: acc.openedAt,
      });
    }
    return out;
  }
}
