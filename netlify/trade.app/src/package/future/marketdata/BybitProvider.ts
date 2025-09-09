import axios from "axios";
import { Candlestick, CandlestickIntervalEnum } from "../../common/MapperType";
import { MarketDataProvider } from "./Provider";

// Bybit linear perpetual USDT market data provider
export class BybitProvider implements MarketDataProvider {
  name = "bybit";
  private failCache: Map<string, number> = new Map();
  private blockedUntil = 0;

  isAvailable(): boolean {
    return Date.now() >= this.blockedUntil;
  }

  private mapInterval(period: CandlestickIntervalEnum): string {
    const id = period.futureIntervalId;
    const map: Record<string, string> = {
      "1m": "1",
      "5m": "5",
      "15m": "15",
      "30m": "30",
      "1H": "60",
      "2H": "120",
      "4H": "240",
      "6H": "360",
      "12H": "720",
      "1D": "D",
    };
    return map[id] || "60"; // défaut 1h
  }

  async getCandles(symbol: string, period: CandlestickIntervalEnum, limit: number): Promise<Candlestick[]> {
    if (!this.isAvailable()) return [];
    const now = Date.now();
    const bybitSymbol = `${symbol.toUpperCase()}USDT`; // linear perpetual
    const failExpiry = this.failCache.get(bybitSymbol);
    if (failExpiry && failExpiry > now) return [];
    const interval = this.mapInterval(period);
    const url = "https://api.bybit.com/v5/market/kline";
    try {
      const { data } = await axios.get(url, {
        timeout: 10_000,
        params: {
          category: "linear",
            symbol: bybitSymbol,
            interval,
            limit: Math.min(limit, 1000),
        },
      });
      if (data?.retCode !== 0) {
        // retCode 10003 / rate limits etc.
        this.failCache.set(bybitSymbol, now + 5 * 60_000);
        return [];
      }
      const list: unknown[] = data?.result?.list || [];
      if (!Array.isArray(list) || !list.length) {
        this.failCache.set(bybitSymbol, now + 5 * 60_000);
        return [];
      }
      // Each item: [ startTimeSec, open, high, low, close, volume, turnover, ... ] startTime in seconds
      type Raw = [string,string,string,string,string,string,string,...unknown[]];
      const candles: Candlestick[] = (list as Raw[]).map(r => ({
        ts: Number(r[0]) * 1000,
        open: Number(r[1]),
        high: Number(r[2]),
        low: Number(r[3]),
        close: Number(r[4]),
        baseVol: Number(r[5]) || 0,
        quoteVol: Number(r[6]) || 0,
      }));
      candles.sort((a,b)=>a.ts-b.ts);
      return candles.length > limit ? candles.slice(candles.length - limit) : candles;
  } catch {
      // simple cooldown on error
      this.failCache.set(bybitSymbol, now + 5 * 60_000);
      return [];
    }
  }
}
