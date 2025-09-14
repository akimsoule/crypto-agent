/* eslint-disable @typescript-eslint/no-explicit-any */
import { Account } from "../../common/Account";
import {
  MixHoldSideEnum,
  OrderSideEnum,
  JSONObject,
  JSONArray,
  Group,
} from "../../common/MapperType";
import { FutureInvestorCopy } from "./FutureInvestorCopy";
import { FutureInvestorCandle } from "./FutureInvestorCandle";
import { CandlestickIntervalEnum } from "../../common/MapperType";
import type { PrismaClient } from "@prisma/client";
import {
  prisma as sharedPrisma,
  persistOrder,
  persistPositions,
} from "../../common/Persistence";
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
    posObj: JSONObject
  ): Promise<boolean> {
    void posObj;
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

      const investor = await this.prisma.investorProfile.findUnique({
        where: { id: this.investorId },
      });
      if (investor) {
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
        // Après fermeture, sauvegarder l'état de position (explicite plutôt que {} pour lisibilité)
        try {
          const positions: { [k in MixHoldSideEnum]?: JSONObject } = {};
          // position fermée => envoyer objet avec zéros pour suppression/normalisation en BD
          positions[mixHoldSideEnum] = {
            available: "0",
            marginSize: "0",
            locked: "0",
            openPriceAvg: "0",
            rawPayload: {},
          } as JSONObject;
          const meta = {
            leverage: (this.group as any)?.margeLeverage || 1,
            marginMode: (this.group as any)?.marginMode || "crossed",
            marginCoin: (this.group as any)?.marginCoin || "USDT",
          };
          await persistPositions(investor, symbol, positions, meta);

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
              `• ⏱️ ${when}`,
            ].join("\n");
            await this.candle.config.telegramClient.sendMessage(
              this.candle.config.telegramGroupOrderId,
              msg
            );
          } catch (e) {
            console.warn("telegram send failed", e);
          }
        } catch (err) {
          console.error("persistPositions (exit) error", err);
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
      const history = await this.prisma.order.findMany({
        where: { profileId: this.investorId, symbol },
        orderBy: { createdAt: "asc" },
      });
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
        } else {
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
        } else {
          currentPrice = 0;
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

  getHistoryPositions(symbol: string): Promise<JSONArray> {
    return this.prisma.order
      .findMany({
        where: { profileId: this.investorId, symbol },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
      .then((history) =>
        history.map((h) => ({
          id: h.orderId,
          symbol: h.symbol,
          action:
            h.side === OrderSideEnum.BUY
              ? OrderSideEnum.BUY
              : OrderSideEnum.SELL,
          price: Number(h.priceAvg || 0),
          quantity: Number(h.size || 0),
          amount: Number(h.quoteVolume || 0),
          timestamp: h.createdAt,
        }))
      );
  }

  getLastOrder(
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<JSONObject> {
    void mixHoldSideEnum;
    // Récupérer la dernière order depuis la BD
    return (async () => {
      const last = await this.prisma.order.findFirst({
        where: { profileId: this.investorId, symbol },
        orderBy: { createdAt: "desc" },
      });
      if (!last) return {};
      const obj: JSONObject = {};
      obj[Label.SYMBOL] = symbol;
      obj[Label.UTIME] = last.createdAt.getTime();
      obj[Label.SIDE] = last.side;
      obj[Label.PRICE] = Number(last.priceAvg || 0);
      obj[Label.SIZE] = Number(last.size || 0);
      return obj;
    })();
  }

  getCurrentPrice(symbol: string): Promise<number> {
    return this.prisma.cryptoGemProject
      .findFirst({ where: { symbol } })
      .then((p) => p?.currentPrice ?? 0)
      .catch(() => 0);
  }

  getQtyToInvest(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<number> {
    void symbol;
    void mixHoldSideEnum;
    if (currentPrice <= 0) return Promise.resolve(0);
    return (async () => {
      const profile = await this.prisma.investorProfile.findUnique({
        where: { id: this.investorId },
      });
      if (!profile) return 0;
      const pos = await this.getCurrentPosition(symbol, mixHoldSideEnum);
      const openSize =
        (pos[Label.OPEN_SIZE] as number) || (pos[Label.SIZE] as number) || 0;
      const currentValue = openSize * currentPrice;
      const maxPositionValueUSD =
        profile.initialBalance * (profile.maxPositionSize / 100);
      const remainingCap = Math.max(0, maxPositionValueUSD - currentValue);
      if (remainingCap < 10) return 0;
      const perOrderCap =
        profile.initialBalance * (profile.riskTolerance || 0.5);
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
