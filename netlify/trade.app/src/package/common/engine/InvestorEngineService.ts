import { OrdersRepo } from "../Persistence";
import { FutureInvestorCandle } from "../../future/investor/FutureInvestorCandle";
import { CandlestickIntervalEnum } from "../MapperType";
import {
  TradingEngine,
  OrderSideEnum,
  MixHoldSideEnum,
  type Order as EngineOrder,
  type Position as EnginePosition,
} from "./index";

export type InvestorSnapshot = {
  positions: EnginePosition[];
  portfolio: ReturnType<TradingEngine["getPortfolioStats"]>;
  realized: ReturnType<TradingEngine["getRealizedPnLStats"]>;
};

export class InvestorEngineService {
  constructor(private readonly md: FutureInvestorCandle) {}

  private async loadEngineOrders(profileId: string, symbols?: string[]): Promise<{ orders: EngineOrder[]; symbols: string[] }> {
    const list = symbols?.length
      ? (await Promise.all(symbols.map((s) => OrdersRepo.listByProfileAndSymbol(profileId, s, 2000)))).flat()
      : await OrdersRepo.listByProfile(profileId);

    const ords: EngineOrder[] = [];
    const set = new Set<string>();
    for (const r of list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
      const side = String(r.side || "").toLowerCase();
      const posSide = String(r.posSide || "").toLowerCase();
      const size = Number(r.size);
      const price = Number(r.priceAvg);
      if (!Number.isFinite(size) || !Number.isFinite(price)) continue;
      ords.push({
        id: String(r.orderId),
        symbol: r.symbol,
        side: side === "sell" ? OrderSideEnum.SELL : OrderSideEnum.BUY,
        posSide: posSide.includes("short") ? MixHoldSideEnum.SHORT : MixHoldSideEnum.LONG,
        size,
        priceAvg: price,
        fee: Number(r.fee || 0),
        createdAt: r.createdAt,
      });
      set.add(r.symbol);
    }
    return { orders: ords, symbols: Array.from(set) };
  }

  private async currentPrices(symbols: string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    await Promise.all(
      symbols.map(async (s) => {
        const cs = await this.md.getCandles(s, CandlestickIntervalEnum.HOURLY, new Date(), 1);
        const p = cs?.length ? Number(cs[cs.length - 1].close) : NaN;
        if (Number.isFinite(p)) out[s] = p as number;
      })
    );
    return out;
  }

  async snapshot(profileId: string, leverage = 10, symbols?: string[]): Promise<InvestorSnapshot> {
    const { orders, symbols: usedSymbols } = await this.loadEngineOrders(profileId, symbols);
    const prices = await this.currentPrices(usedSymbols);
    // fallback: si un symbole n’a pas de prix live, on met le dernier prix d’ordre
    for (const o of orders) if (!prices[o.symbol]) prices[o.symbol] = o.priceAvg;

    const engine = new TradingEngine(orders, leverage);
    const positions = engine.rebuildAllPositions(prices);
    positions.sort((a, b) => b.pnlUnrealized - a.pnlUnrealized);
    const portfolio = engine.getPortfolioStats(prices);
    const realized = engine.getRealizedPnLStats();
    return { positions, portfolio, realized };
  }
}
