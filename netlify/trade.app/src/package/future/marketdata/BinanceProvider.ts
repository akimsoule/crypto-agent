import axios from "axios";
import https from "https";
import { Candlestick, CandlestickIntervalEnum } from "../../common/MapperType";
import { MarketDataProvider } from "./Provider";

export class BinanceProvider implements MarketDataProvider {
  name = "binance";
  private failCache: Map<string, number> = new Map();

  isAvailable(): boolean { return true; }

  async getCandles(symbol: string, period: CandlestickIntervalEnum, limit: number): Promise<Candlestick[]> {
    const now = Date.now();
    const mapped = `${symbol.toUpperCase()}USDT`;
    const failExpiry = this.failCache.get(mapped);
    if (failExpiry && failExpiry > now) return [];
    const interval = period.futureIntervalId.replace("H","h").replace("D","d");
    try {
      const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${mapped}&interval=${interval}&limit=${Math.min(limit,500)}`;
      const agent = new https.Agent({ keepAlive: true, timeout: 10_000 });
      const { data } = await axios.get(url, { timeout: 10_000, httpsAgent: agent });
      if (!Array.isArray(data) || !data.length) {
        this.failCache.set(mapped, now + 5 * 60_000);
        return [];
      }
  type RawKline = [number,string,string,string,string,string, string, string];
  const candles: Candlestick[] = (data as RawKline[]).map((k) => ({
        ts: k[0],
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        quoteVol: Number(k[7]) || 0,
        baseVol: Number(k[5]) || 0,
      }));
      candles.sort((a,b)=>a.ts-b.ts);
      return candles.length > limit ? candles.slice(candles.length - limit) : candles;
    } catch {
      this.failCache.set(mapped, now + 5 * 60_000);
      return [];
    }
  }
}
