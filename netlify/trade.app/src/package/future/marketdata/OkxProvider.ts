import axios from "axios";
import { Candlestick, CandlestickIntervalEnum } from "../../common/MapperType";
import { MarketDataProvider } from "./Provider";

// OKX perpetual swap (USDT) provider
export class OkxProvider implements MarketDataProvider {
  name = "okx";
  private failCache: Map<string, number> = new Map();

  isAvailable(): boolean { return true; }

  private mapInterval(period: CandlestickIntervalEnum): string {
    const id = period.futureIntervalId;
    const map: Record<string,string> = {
      "1m": "1m",
      "5m": "5m",
      "15m": "15m",
      "30m": "30m",
      "1H": "1H",
      "2H": "2H",
      "4H": "4H",
      "6H": "6H",
      "12H": "12H",
      "1D": "1D",
    };
    return map[id] || "1H";
  }

  async getCandles(symbol: string, period: CandlestickIntervalEnum, limit: number): Promise<Candlestick[]> {
    const now = Date.now();
    const instId = `${symbol.toUpperCase()}-USDT-SWAP`;
    const failExpiry = this.failCache.get(instId);
    if (failExpiry && failExpiry > now) return [];
    const bar = this.mapInterval(period);
    const url = "https://www.okx.com/api/v5/market/candles";
    try {
      const { data } = await axios.get(url, { params: { instId, bar, limit: Math.min(limit, 300) }, timeout: 10_000 });
      const arr: unknown[] = data?.data || [];
      if (!Array.isArray(arr) || !arr.length) {
        this.failCache.set(instId, now + 5 * 60_000);
        return [];
      }
      // OKX returns newest first -> reverse after mapping
      type Raw = [string,string,string,string,string,string,string,string,string];
      const mapped: Candlestick[] = (arr as Raw[]).map(r => ({
        ts: Number(r[0]),
        open: Number(r[1]),
        high: Number(r[2]),
        low: Number(r[3]),
        close: Number(r[4]),
        baseVol: Number(r[5]) || 0,
        quoteVol: Number(r[6]) || 0,
      }));
      mapped.sort((a,b)=>a.ts-b.ts);
      return mapped.length > limit ? mapped.slice(mapped.length - limit) : mapped;
    } catch {
      this.failCache.set(instId, now + 5 * 60_000);
      return [];
    }
  }
}
