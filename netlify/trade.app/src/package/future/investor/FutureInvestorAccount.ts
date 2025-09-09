/* eslint-disable @typescript-eslint/no-explicit-any */
import { Account } from "../../common/Account";
import {
  MixHoldSideEnum,
  JSONObject,
  JSONArray,
  Group,
} from "../../common/MapperType";
import { FutureInvestorCopy } from "./FutureInvestorCopy";
import { PrismaClient } from "@prisma/client";
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

  constructor(investorId: string, prisma?: PrismaClient) {
    super();
    this.investorId = investorId;
    this.prisma = prisma || new PrismaClient();
    this.group = {} as Group;
    this.cache = {};
  }

  public fetchWithCache(
    key: string,
    fetchFunction: () => Promise<any>
  ): Promise<any> {
    if (this.cache[key]) return Promise.resolve(this.cache[key]);
    return fetchFunction().then((data) => {
      this.cache[key] = data;
      return data;
    });
  }

  entry(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean> {
    // Support LONG uniquement pour simplicité
    if (mixHoldSideEnum !== MixHoldSideEnum.LONG) return Promise.resolve(false);
    return (async () => {
      const qty = await this.getQtyToInvest(
        symbol,
        currentPrice,
        mixHoldSideEnum
      );
      if (qty <= 0) return false;
      const project = await this.prisma.cryptoGemProject.findFirst({
        where: { symbol },
      });
      if (!project) return false;
      // On insère un Order (buy) simplifié dans la table Order (prisma.order)
      const orderId = `${this.investorId}:${symbol}:BUY:${Date.now()}`;
      await this.prisma.order.create({
        data: {
          orderId,
          profileId: this.investorId,
          symbol,
          size: String(qty),
          clientOid: `cli-${orderId}`,
          baseVolume: String(qty),
          priceAvg: String(currentPrice),
          quoteVolume: String(qty * currentPrice),
          side: "buy",
          posSide: MixHoldSideEnum.LONG,
          rawPayload: {
            reason: `INVESTOR_ENTRY ${mixHoldSideEnum}`,
            coinId: project.coinId,
            leverage: (this.group as any)?.margeLeverage || 1,
          },
        },
      });
      return true;
    })().catch((e) => {
      console.error("FutureInvestorAccount.entry error", e);
      return false;
    });
  }
  exit(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean> {
    if (mixHoldSideEnum !== MixHoldSideEnum.LONG) return Promise.resolve(false);
    return (async () => {
      const pos = await this.getCurrentPosition(symbol, mixHoldSideEnum);
      const qty =
        (pos[Label.OPEN_SIZE] as number) || (pos[Label.SIZE] as number) || 0;
      if (qty <= 0) return false;
      const project = await this.prisma.cryptoGemProject.findFirst({
        where: { symbol },
      });
      if (!project) return false;
      const orderId = `${this.investorId}:${symbol}:SELL:${Date.now()}`;
      await this.prisma.order.create({
        data: {
          orderId,
          profileId: this.investorId,
          symbol,
          size: String(qty),
          clientOid: `cli-${orderId}`,
          baseVolume: String(qty),
          priceAvg: String(currentPrice),
          quoteVolume: String(qty * currentPrice),
          side: "sell",
          posSide: MixHoldSideEnum.LONG,
          rawPayload: {
            reason: `INVESTOR_EXIT ${mixHoldSideEnum}`,
          },
        },
      });
      return true;
    })().catch((e) => {
      console.error("FutureInvestorAccount.exit error", e);
      return false;
    });
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
    if (mixHoldSideEnum !== MixHoldSideEnum.LONG) return Promise.resolve({});
    return (async () => {
      // Reconstituer historique à partir des orders (buy/sell) du profil & symbole
      const history = await this.prisma.order.findMany({
        where: { profileId: this.investorId, symbol },
        orderBy: { createdAt: "asc" },
      });
      let qty = 0;
      let cost = 0;
      for (const tr of history) {
        const action = (tr.side || "").toUpperCase();
        const q = Number(tr.size || 0);
        const price = Number(tr.priceAvg || 0);
        if (action === "BUY") {
          qty += q;
          cost += q * price;
        } else if (action === "SELL") {
          const remain = Math.max(0, qty - q);
          const closed = qty - remain;
          const avgPrice = qty > 0 ? cost / qty : 0;
            cost -= closed * avgPrice;
          qty = remain;
        }
      }
      if (qty <= 0) return {};
      const proj = await this.prisma.cryptoGemProject.findFirst({
        where: { symbol },
      });
      const currentPrice = proj?.currentPrice ?? 0;
      const leverage = (this.group as any)?.margeLeverage || 1;
      const avgPrice = qty > 0 ? cost / qty : 0;
      const pos: JSONObject = {};
      pos[Label.AVERAGE_OPEN_PRICE] = avgPrice;
      pos[Label.OPEN_PRICE_AVG] = avgPrice;
      pos[Label.SIZE] = qty;
      pos[Label.OPEN_SIZE] = qty;
      pos[Label.OPEN_LEVERAGE] = leverage;
      pos[Label.HOLD_SIDE] = MixHoldSideEnum.LONG;
      const usdtVal = qty * currentPrice;
      pos[Label.MARGIN] = leverage > 0 ? usdtVal / leverage : usdtVal;
      return pos;
    })();
  }
  getAllPositions(): Promise<JSONArray> {
    return (async () => {
      const positions: JSONArray = [];
      for (const symbol of this.group?.symbols || []) {
        const pos = await this.getCurrentPosition(symbol, MixHoldSideEnum.LONG);
        if (Object.keys(pos).length > 0) positions.push(pos);
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
          action: h.side?.toUpperCase() === "BUY" ? "BUY" : "SELL",
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
      const pos = await this.getCurrentPosition(symbol, MixHoldSideEnum.LONG);
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
