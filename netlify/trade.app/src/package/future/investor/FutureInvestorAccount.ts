import { Account } from "../../common/Account";
import {
  MixHoldSideEnum,
  OrderSideEnum,
  JSONObject,
  JSONArray,
  Group,
 CandlestickIntervalEnum } from "../../common/MapperType";
import { FutureInvestorCopy } from "./FutureInvestorCopy";
import { FutureInvestorCandle } from "./FutureInvestorCandle";
import type { PrismaClient } from "@prisma/client";
import { prisma as sharedPrisma, persistOrder, persistPositions, OrdersRepo } from "../../common/Persistence";
import { TradingEngine, MixHoldSideEnum as EngineHoldSideEnum, OrderSideEnum as EngineOrderSideEnum, type Order as EngineOrder } from "../../common/engine/engine";
import { Label } from "../../common/Label";
import { FilterRoi } from "../../filter/Filter";

export class FutureInvestorAccount
  extends FutureInvestorCopy
  implements Account
{
  group: Group;
  public cache: { [key: string]: any };
  private prisma: PrismaClient;
  private investorId: string;
  private candle: FutureInvestorCandle;

  constructor(investorId: string, candle: FutureInvestorCandle) {
    super();
    this.investorId = investorId;
    this.prisma = sharedPrisma;
    this.group = {} as Group;
    this.cache = {};
    this.candle = candle;
  }

  exitAllCopyIfPL(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean> {
    return this.exitIfPL(symbol, currentPrice, mixHoldSideEnum);
  }

  exitAllCopy(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean> {
    return this.exit(symbol, currentPrice, mixHoldSideEnum);
  }

  exitCopy(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    _posObj: JSONObject
  ): Promise<boolean> {
    return this.exit(symbol, currentPrice, mixHoldSideEnum);
  }

  public async fetchWithCache(
    key: string,
    fetchFunction: () => Promise<any>
  ): Promise<any> {
    if (this.cache[key]) return Promise.resolve(this.cache[key]);
    const data = await fetchFunction();
    this.cache[key] = data;
    return data;
  }

  // Délègue la persistance de la position au repository (DEV only)
  private async persistCurrentPosition(
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum,
    currentPrice: number
  ): Promise<void> {
    const investor = await this.prisma.investorProfile.findUnique({ where: { id: this.investorId } });
    if (!investor) return;
    const prePos = await this.getCurrentPosition(symbol, mixHoldSideEnum);
    const qty = (prePos[Label.OPEN_SIZE] as number) || (prePos[Label.SIZE] as number) || 0;
    const avg = (prePos[Label.AVERAGE_OPEN_PRICE] as number) || (prePos[Label.OPEN_PRICE_AVG] as number) || 0;
    const leverage = (prePos[Label.OPEN_LEVERAGE] as number) || (this.group as any)?.margeLeverage || 1;
    const mark = currentPrice > 0 ? currentPrice : avg;
    const meta = {
      leverage: (this.group as any)?.margeLeverage || 1,
      marginMode: (this.group as any)?.marginMode || "crossed",
      marginCoin: (this.group as any)?.marginCoin || "USDT",
    };
    if (qty <= 0 || avg <= 0) {
      // marquer l’exécution sans stocker de payload
      await persistPositions(investor, symbol);
      return;
    }
    const posPayload: JSONObject = {
      openLeverage: String(leverage),
      openPriceAvg: String(avg),
      available: String(qty),
      margin: String(leverage > 0 ? Math.abs(qty * mark) / leverage : Math.abs(qty * mark)),
      markPrice: String(mark),
    } as JSONObject;
    await persistPositions(investor, symbol, { [mixHoldSideEnum]: posPayload } as any, meta);
  }

  async entry(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean> {
    try {
      const qty = await this.getQtyToInvest(
        symbol,
        currentPrice,
        mixHoldSideEnum
      );
      if (qty <= 0) return false;

      // Persister l'ordre d'entrée (sens dépend du hold side)
      const investor = await this.prisma.investorProfile.findUnique({
        where: { id: this.investorId },
      });
      if (investor) {
        const rawOrder: JSONObject = {
          orderId: `${this.investorId}-${symbol}-${Date.now()}-entry`,
          size: String(qty),
          priceAvg: String(currentPrice),
          side:
            mixHoldSideEnum === MixHoldSideEnum.LONG
              ? OrderSideEnum.BUY
              : OrderSideEnum.SELL,
        };
        await persistOrder({
          investor,
          symbol,
          side:
            mixHoldSideEnum === MixHoldSideEnum.LONG
              ? OrderSideEnum.BUY
              : OrderSideEnum.SELL,
          posSide: mixHoldSideEnum,
          currentPrice,
          rawOrder,
        });

        //envoyer de message telegram
        try {
          const when = new Date().toISOString();
          const sideEmoji =
            mixHoldSideEnum === MixHoldSideEnum.LONG ? "🟢 LONG" : "🔴 SHORT";
          const msg = [
            `🔔 Nouvel ordre (Entry) — ${investor.name || this.investorId}`,
            `• 📊 ${symbol} — ${sideEmoji}`,
            `• 📦 Qty: ${qty.toFixed(6)}`,
            `• 💵 Price: ${currentPrice.toFixed(6)}`,
            `• ⏱️ ${when}`,
          ].join("\n");
          await this.candle.config.telegramClient.sendMessage(
            this.candle.config.telegramGroupOrderId,
            msg
          );
        } catch (e) {
          console.warn("telegram send failed", e);
        }
      } else {
        console.error(
          `entry: investor profile not found for id=${this.investorId}`
        );
        return false;
      }

      return true;
    } catch (e) {
      console.error("FutureInvestorAccount.entry error", e);
      return false;
    }
  }

  async exit(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean> {
    if (
      mixHoldSideEnum !== MixHoldSideEnum.LONG &&
      mixHoldSideEnum !== MixHoldSideEnum.SHORT
    )
      return false;
    try {
      const pos = await this.getCurrentPosition(symbol, mixHoldSideEnum);
      const qty =
        (pos[Label.OPEN_SIZE] as number) || (pos[Label.SIZE] as number) || 0;
      if (qty <= 0) return false;

      const investor = await this.prisma.investorProfile.findUnique({ where: { id: this.investorId } });
      if (investor) {
        // Persister la position actuelle AVANT de persister l'ordre de sortie
        try { await this.persistCurrentPosition(symbol, mixHoldSideEnum, currentPrice); } catch {}

        const rawOrder: JSONObject = {
          orderId: `${this.investorId}-${symbol}-${Date.now()}-exit`,
          size: String(qty),
          priceAvg: String(currentPrice),
          // Pour fermer LONG on SELL, pour fermer SHORT on BUY
          side:
            mixHoldSideEnum === MixHoldSideEnum.LONG
              ? OrderSideEnum.SELL
              : OrderSideEnum.BUY,
        };
        await persistOrder({
          investor,
          symbol,
          side:
            mixHoldSideEnum === MixHoldSideEnum.LONG
              ? OrderSideEnum.SELL
              : OrderSideEnum.BUY,
          posSide: mixHoldSideEnum,
          currentPrice,
          rawOrder,
        });
        // 1. Charger tous les ordres du profil pour le symbole+posSide
        let realizedPnl = 0;
        let deletedOrderIds: string[] = [];
        try {
          const orderRecords = await OrdersRepo.listByProfileSymbolPosSide(investor.id, symbol, mixHoldSideEnum.toLowerCase());
          // Construire les ordres pour le moteur
          const engineOrders: EngineOrder[] = orderRecords
            .sort((a,b)=> a.createdAt.getTime()-b.createdAt.getTime())
            .map(r => ({
              id: r.orderId,
              symbol: r.symbol,
              side: String(r.side).toLowerCase() === 'sell' ? EngineOrderSideEnum.SELL : EngineOrderSideEnum.BUY,
              posSide: mixHoldSideEnum === MixHoldSideEnum.LONG ? EngineHoldSideEnum.LONG : EngineHoldSideEnum.SHORT,
              size: Number(r.size),
              priceAvg: Number(r.priceAvg),
              fee: Number(r.fee || 0),
              createdAt: r.createdAt,
            }));
          // Ajouter l'ordre de fermeture simulé dans le moteur pour finaliser le round
          engineOrders.push({
            id: rawOrder.orderId as string,
            symbol,
            side: mixHoldSideEnum === MixHoldSideEnum.LONG ? EngineOrderSideEnum.SELL : EngineOrderSideEnum.BUY,
            posSide: mixHoldSideEnum === MixHoldSideEnum.LONG ? EngineHoldSideEnum.LONG : EngineHoldSideEnum.SHORT,
            size: qty,
            priceAvg: currentPrice,
            fee: 0,
            createdAt: new Date(),
          });
          const engine = new TradingEngine(engineOrders, Number((this.group as any)?.margeLeverage || 1));
          const closedTrades = engine.getClosedTrades().filter(ct => ct.symbol === symbol && ct.posSide === (mixHoldSideEnum === MixHoldSideEnum.LONG ? EngineHoldSideEnum.LONG : EngineHoldSideEnum.SHORT));
          // Dernier trade fermé correspond au round actuel
            const lastClosed = closedTrades[closedTrades.length -1];
            if (lastClosed) {
              realizedPnl = lastClosed.realizedPnl;
              // Déterminer quels ordres constituent ce round: on rejoue jusqu'à closedAt
              // Simplification: on supprime tous les ordres historiques + l'ordre de sortie simulé (rawOrder)
              deletedOrderIds = orderRecords.map(o=>o.orderId);
            }
          // Mettre à jour balance = initialBalance + somme realizedPnl de tous trades fermés (recalcul global)
          const allOrdersProfile = await OrdersRepo.listByProfile(investor.id);
          const allEngineOrders: EngineOrder[] = allOrdersProfile.map(r => ({
            id: r.orderId,
            symbol: r.symbol,
            side: String(r.side).toLowerCase() === 'sell' ? EngineOrderSideEnum.SELL : EngineOrderSideEnum.BUY,
            posSide: String(r.posSide).toLowerCase().includes('short') ? EngineHoldSideEnum.SHORT : EngineHoldSideEnum.LONG,
            size: Number(r.size),
            priceAvg: Number(r.priceAvg),
            fee: Number(r.fee || 0),
            createdAt: r.createdAt,
          }));
          // Inclure l'ordre de sortie dans le calcul global
          allEngineOrders.push(engineOrders[engineOrders.length-1]);
          const globalEngine = new TradingEngine(allEngineOrders, Number((this.group as any)?.margeLeverage || 1));
          const realizedStats = globalEngine.getRealizedPnLStats();
          const newBalance = Number(investor.initialBalance || 0) + realizedStats.totalRealizedPnL;
          await this.prisma.investorProfile.update({ where: { id: investor.id }, data: { currentBalance: newBalance } });
          // Suppression des ordres du round fermé (historique symbol+posSide) pour repartir sur base clean
          if (deletedOrderIds.length) {
            await this.prisma.order.deleteMany({ where: { orderId: { in: deletedOrderIds } } });
          }
        } catch(err) {
          console.warn('exit: engine reconstruction failed', err);
        }
        //envoyer de message telegram
          try {
            const avg =
              (pos[Label.AVERAGE_OPEN_PRICE] as number) ||
              (pos[Label.OPEN_PRICE_AVG] as number) ||
              0;
            const pnl =
              mixHoldSideEnum === MixHoldSideEnum.LONG
                ? (currentPrice - avg) * qty
                : (avg - currentPrice) * qty;
            const denom = Math.max(0, avg * qty);
            const pnlPct = denom > 0 ? (pnl / denom) * 100 : 0;
            const sign = pnl >= 0 ? "+" : "";
            const when = new Date().toISOString();
            const trendEmoji = pnl >= 0 ? "📈" : "📉";
            const sideEmoji =
              mixHoldSideEnum === MixHoldSideEnum.LONG ? "🟢 LONG" : "🔴 SHORT";
            const msg = [
              `🏁 Fermeture (Exit) — ${investor.name || this.investorId}`,
              `• 📊 ${symbol} — ${sideEmoji}`,
              `• 📦 Qty: ${qty.toFixed(6)}`,
              `• 🎯 Avg: ${avg.toFixed(6)}`,
              `• 💵 Price: ${currentPrice.toFixed(6)}`,
              `• ${trendEmoji} PnL: ${sign}${pnl.toFixed(2)} USDT (${sign}${pnlPct.toFixed(2)}%)`,
              `• 💼 Balance: ${(Number(investor.initialBalance || 0) + realizedPnl).toFixed(2)} USDT (simulé)`,
              `• ⏱️ ${when}`,
            ].join("\n");
            await this.candle.config.telegramClient.sendMessage(
              this.candle.config.telegramGroupOrderId,
              msg
            );
          } catch (e) {
            console.warn("telegram send failed", e);
          }
      } else {
        console.error(
          `exit: investor profile not found for id=${this.investorId}`
        );
        return false;
      }

      return true;
    } catch (e) {
      console.error("FutureInvestorAccount.exit error", e);
      return false;
    }
  }

  exitIfPL(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean> {
    return (async () => {
      const position = await this.getCurrentPosition(symbol, mixHoldSideEnum);
      const filter = new FilterRoi();
      if (filter.isWinning(position, currentPrice)) {
        return this.exit(symbol, currentPrice, mixHoldSideEnum);
      }
      return false;
    })();
  }

  getCurrentPosition(
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<JSONObject> {
    if (
      mixHoldSideEnum !== MixHoldSideEnum.LONG &&
      mixHoldSideEnum !== MixHoldSideEnum.SHORT
    )
      return Promise.resolve({});

    return (async () => {
      // Reconstituer historique à partir des orders (buy/sell) du profil & symbole
      const history = await OrdersRepo.listByProfileSymbolPosSide(
        this.investorId,
        symbol,
        mixHoldSideEnum.toLowerCase()
      );
      let qty = 0;
      let cost = 0;

      for (const tr of history) {
        const action = String(tr.side || "").toLowerCase();
        const q = Number(tr.size || 0);
        const price = Number(tr.priceAvg || 0);
        if (Number.isNaN(q) || Number.isNaN(price)) continue;

        if (mixHoldSideEnum === MixHoldSideEnum.LONG) {
          if (action === OrderSideEnum.BUY) {
            qty += q;
            cost += q * price;
          } else if (action === OrderSideEnum.SELL) {
            const remain = Math.max(0, qty - q);
            const closed = qty - remain;
            const avgPrice = qty > 0 ? cost / qty : 0;
            cost -= closed * avgPrice;
            qty = remain;
          }
        } else if (mixHoldSideEnum === MixHoldSideEnum.SHORT) {
          // SHORT: SELL opens position, BUY closes
          if (action === OrderSideEnum.SELL) {
            qty += q;
            cost += q * price;
          } else if (action === OrderSideEnum.BUY) {
            const remain = Math.max(0, qty - q);
            const closed = qty - remain;
            const avgPrice = qty > 0 ? cost / qty : 0;
            cost -= closed * avgPrice;
            qty = remain;
          }
        }
      }

      if (qty <= 0) return {};

      // Récupérer le prix courant via FutureInvestorCandle (utilise son cache)
      let currentPrice = 0;
      try {
        const period =
          (this.group as any)?.period || CandlestickIntervalEnum.HOURLY;
        const candles = await this.candle.getCandles(
          symbol,
          period,
          new Date(),
          1
        );
        if (candles && candles.length) {
          const last = candles[candles.length - 1];
          currentPrice = Number(last.close || 0);
        }
      } catch (err) {
        // En cas d'erreur d'accès au provider/candle, on retourne 0 (comportement antérieur
        // était de retomber sur la table cryptoGemProject). Ici on évite l'accès direct à Prisma.
        console.warn(
          "getCurrentPosition: unable to fetch candles for",
          symbol,
          err
        );
        currentPrice = 0;
      }
      const leverage = (this.group as any)?.margeLeverage || 1;
      const avgPrice = qty > 0 ? cost / qty : 0;

      const pos: JSONObject = {};
      pos[Label.AVERAGE_OPEN_PRICE] = avgPrice;
      pos[Label.OPEN_PRICE_AVG] = avgPrice;
      pos[Label.SIZE] = qty;
      pos[Label.OPEN_SIZE] = qty;
      pos[Label.OPEN_LEVERAGE] = leverage;
      pos[Label.HOLD_SIDE] = mixHoldSideEnum;
      // Exposure should be absolute for capacity calculations
      const usdtVal = Math.abs(qty * currentPrice);
      pos[Label.MARGIN] = leverage > 0 ? usdtVal / leverage : usdtVal;
      return pos;
    })();
  }

  getAllPositions(): Promise<JSONArray> {
    return (async () => {
      const positions: JSONArray = [];
      for (const symbol of this.group?.symbols || []) {
        const posLong = await this.getCurrentPosition(
          symbol,
          MixHoldSideEnum.LONG
        );
        if (Object.keys(posLong).length > 0) positions.push(posLong);
        const posShort = await this.getCurrentPosition(
          symbol,
          MixHoldSideEnum.SHORT
        );
        if (Object.keys(posShort).length > 0) positions.push(posShort);
      }
      return positions;
    })();
  }

  async getHistoryPositions(symbol: string): Promise<JSONArray> {
    const history = await OrdersRepo.listByProfileAndSymbol(
      this.investorId,
      symbol,
      50
    );
    return history.map((h) => ({
      id: h.orderId,
      symbol: h.symbol,
      action: h.side === OrderSideEnum.BUY ? OrderSideEnum.BUY : OrderSideEnum.SELL,
      price: Number(h.priceAvg || 0),
      quantity: Number(h.size || 0),
      amount: Number(h.quoteVolume || 0),
      timestamp: h.createdAt,
    }));
  }

  async getLastOrder(
    symbol: string,
    _mixHoldSideEnum: MixHoldSideEnum
  ): Promise<JSONObject> {
    const last = await OrdersRepo.findLastByProfileSymbol(this.investorId, symbol);
    if (!last) return {};
    const obj: JSONObject = {};
    obj[Label.SYMBOL] = symbol;
    obj[Label.UTIME] = last.createdAt.getTime();
    obj[Label.SIDE] = last.side;
    obj[Label.PRICE] = Number(last.priceAvg || 0);
    obj[Label.SIZE] = Number(last.size || 0);
    return obj;
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const period = (this.group as any)?.period || CandlestickIntervalEnum.HOURLY;
      const candles = await this.candle.getCandles(symbol, period, new Date(), 1);
      if (!candles || candles.length === 0) return 0;
      const last = candles[candles.length - 1];
      return Number(last.close || 0);
    } catch {
      return 0;
    }
  }

  getQtyToInvest(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<number> {
    if (currentPrice <= 0) return Promise.resolve(0);
    return (async () => {
      const profile = await this.prisma.investorProfile.findUnique({
        where: { id: this.investorId },
      });
      if (!profile) return 0;
      // Coercition des Decimal Prisma en nombres natifs pour les calculs
      const initialBalance = Number(profile.initialBalance ?? 0);
      const maxPositionSize = Number(profile.maxPositionSize ?? 0);
      const riskTolerance = Number((profile as any).riskTolerance ?? 0.5);
      const pos = await this.getCurrentPosition(symbol, mixHoldSideEnum);
      const openSize =
        (pos[Label.OPEN_SIZE] as number) || (pos[Label.SIZE] as number) || 0;
      const currentValue = openSize * currentPrice;
      const maxPositionValueUSD = initialBalance * (maxPositionSize / 100);
      const remainingCap = Math.max(0, maxPositionValueUSD - currentValue);
      if (remainingCap < 10) return 0;
      const perOrderCap = initialBalance * (riskTolerance || 0.5);
      const allocUSD = Math.max(0, Math.min(remainingCap, perOrderCap));
      return allocUSD / currentPrice;
    })();
  }

  setGroup(group: Group): void {
    this.group = group;
  }
  getGroup(): Group {
    return this.group;
  }
}
