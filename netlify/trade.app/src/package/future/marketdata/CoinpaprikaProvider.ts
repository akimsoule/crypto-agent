import axios from "axios";
import { Candlestick, CandlestickIntervalEnum } from "../../common/MapperType";
import { Util } from "../../common/Util";
import { MarketDataProvider } from "./Provider";

export class CoinpaprikaProvider implements MarketDataProvider {
  name = "coinpaprika";
  private blockedUntil = 0;
  private failCache: Map<string, number> = new Map();

  constructor(private idMap: Record<string, string>) {}

  isAvailable(): boolean {
    return Date.now() >= this.blockedUntil;
  }

  async getCandles(symbol: string, period: CandlestickIntervalEnum, limit: number) {
    if (!this.isAvailable()) return [];
    const now = Date.now();
    const failExpiry = this.failCache.get(symbol);
    if (failExpiry && failExpiry > now) return [];

    const coinId = this.idMap[symbol.toUpperCase()];
    if (!coinId) return [];

    const intervalMap: Record<string, string> = { "15m": "15m", "30m": "30m", "1H": "1h", "4H": "4h" };
    const interval = intervalMap[period.futureIntervalId] || "1h";
    const duration = Util.getDuration(period);
    const start = new Date(Date.now() - duration * (limit + 5)).toISOString().split(".")[0];
    const url = `https://api.coinpaprika.com/v1/tickers/${coinId}/historical?interval=${interval}&limit=${Math.min(limit + 5, 500)}&start=${encodeURIComponent(start)}`;
    try {
      const { data } = await axios.get(url, { timeout: 10_000 });
      if (!Array.isArray(data) || !data.length) {
        this.failCache.set(symbol, now + 10 * 60_000);
        return [];
      }
      interface PaprikaCandleLike { timestamp?: string; time_open?: string; time?: string; date?: string; open?: number; close?: number; price?: number; high?: number; low?: number; volume?: number; volume_24h?: number; }
      const candles: Candlestick[] = (data as PaprikaCandleLike[]).map(d => {
        const dateStr = d.timestamp || d.time_open || d.time || d.date || new Date().toISOString();
        const ts = new Date(dateStr).getTime();
        const open = Number(d.open ?? d.price ?? d.close);
        const close = Number(d.close ?? d.price ?? d.open);
        const high = Number(d.high ?? Math.max(open, close));
        const low = Number(d.low ?? Math.min(open, close));
        const quoteVol = Number(d.volume ?? d.volume_24h ?? 0);
        return { ts, open, high, low, close, quoteVol, baseVol: 0 } as Candlestick;
      });
      candles.sort((a,b)=>a.ts-b.ts);
      return candles.length > limit ? candles.slice(candles.length - limit) : candles;
    } catch (e) {
      const err = e as { response?: { status?: number; headers?: Record<string,string>; data?: unknown } };
      const status = err.response?.status;
      if (status === 402) {
        const retryAfter = Number(err.response?.headers?.["retry-after"]) || 3600;
        this.blockedUntil = now + retryAfter * 1000;
      } else {
        this.failCache.set(symbol, now + 15 * 60_000);
      }
      return [];
    }
  }
}
