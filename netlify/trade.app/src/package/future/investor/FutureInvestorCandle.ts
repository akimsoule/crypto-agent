import { Candle } from "../../common/Candle";
import { Candlestick, CandlestickIntervalEnum } from "../../common/MapperType";
import { Util } from "../../common/Util";
import { Config } from "../../common/Config";
import { Asset } from "../../../types/lib";
import {
  FuturesCandlesRequestV2,
  FuturesKlineInterval,
  FuturesProductTypeV2,
} from "bitget-api";
import { CoinpaprikaProvider } from "../marketdata/CoinpaprikaProvider";
import { BinanceProvider } from "../marketdata/BinanceProvider";
import { BybitProvider } from "../marketdata/BybitProvider";
import { OkxProvider } from "../marketdata/OkxProvider";
import { MarketDataProvider } from "../marketdata/Provider";

// Implémentation: cache partagé -> coinpaprika -> bitget -> throw (pas de synthétique autorisé).
class FutureInvestorCandle implements Candle {
  config: Config;

  private static CACHE: Map<
    string,
    { expiry: number; candles: Candlestick[] }
  > = new Map();
  private static INFLIGHT: Map<string, Promise<Candlestick[]>> = new Map();
  private static providers: MarketDataProvider[] | null = null;

  private static ttl(period: CandlestickIntervalEnum): number {
    // On recalcule au moins toutes les 1/2 période.
    return Math.max(30_000, Util.getDuration(period) / 2);
  }

  constructor(config: Config) {
    this.config = config;
  }

  private key(symbol: string, period: CandlestickIntervalEnum) {
    return `${symbol.toUpperCase()}:${period.futureIntervalId}`;
  }

  private async fetchBitget(symbol: string, period: CandlestickIntervalEnum, limit: number): Promise<Candlestick[]> {
    const params: FuturesCandlesRequestV2 = {
      symbol: this.config.botParameter.getSymbolV2(symbol),
      productType: this.config.botParameter.getProductType() as FuturesProductTypeV2,
      granularity: period.futureIntervalId as FuturesKlineInterval,
      limit: String(Math.min(limit, 100)),
      endTime: Date.now().toString(),
    };
    const data = (await this.config.bitgetClientV2.getFuturesCandles(params)).data as unknown as number[][];
    if (!Array.isArray(data)) throw new Error(`Bitget: format inattendu pour ${symbol}`);
    const mapped = data.map(a => ({
      ts: Number(a[0]), open: Number(a[1]), high: Number(a[2]), low: Number(a[3]), close: Number(a[4]), quoteVol: Number(a[5]), baseVol: Number(a[6])
    }) as Candlestick);
    mapped.sort((x,y)=>x.ts-y.ts);
    if (!mapped.length) throw new Error(`Bitget: aucune bougie retournée pour ${symbol}`);
    return mapped;
  }

  private getProviders(): MarketDataProvider[] {
    if (FutureInvestorCandle.providers) return FutureInvestorCandle.providers;
    const idMap: Record<string,string> = {
      BTC: "btc-bitcoin", ETH: "eth-ethereum", SOL: "sol-solana", LTC: "ltc-litecoin", BCH: "bch-bitcoin-cash", BNB: "bnb-binance-coin", XRP: "xrp-xrp", ADA: "ada-cardano", AVAX: "avax-avalanche", UNI: "uni-uniswap", AAVE: "aave-aave", MKR: "mkr-maker", MANA: "mana-decentraland", SAND: "sand-the-sandbox", INJ: "inj-injective", GRT: "grt-the-graph", FET: "fet-fetch-ai", RNDR: "rndr-render", AGIX: "agix-singularitynet", COMP: "comp-compound", CRV: "crv-curve-dao-token", XLM: "xlm-stellar", XMR: "xmr-monero", ZEC: "zec-zcash", APE: "ape-apecoin" };
    FutureInvestorCandle.providers = [
      new CoinpaprikaProvider(idMap),
      new BinanceProvider(),
      new BybitProvider(),
      new OkxProvider(),
      { // Bitget wrapper as provider interface (last)
        name: "bitget",
        isAvailable: () => true,
        getCandles: (s: string, p: CandlestickIntervalEnum, l: number) => this.fetchBitget(s,p,l)
      },
    ];
    return FutureInvestorCandle.providers;
  }


  async getCandles(
    symbol: string,
    period: CandlestickIntervalEnum,
    before: Date,
    limit: number
  ): Promise<Candlestick[]> {
    const key = this.key(symbol, period);
    const now = Date.now();
    const cached = FutureInvestorCandle.CACHE.get(key);
    if (cached && cached.expiry > now && cached.candles.length >= limit) {
      return cached.candles.slice(cached.candles.length - limit);
    }

    const inflight = FutureInvestorCandle.INFLIGHT.get(key);
    if (inflight) {
      const data = await inflight;
      return data.length > limit ? data.slice(data.length - limit) : data;
    }

    const promise = (async () => {
      try {
        let candles: Candlestick[] | undefined;
        for (const provider of this.getProviders()) {
          if (!provider.isAvailable()) continue;
          try {
            const data = await provider.getCandles(symbol, period, Math.max(limit, 50));
            if (data.length) {
              candles = data;
              break;
            }
          } catch (e) {
            if (process.env.LOG_LEVEL === 'debug') {
              const err = e as { body?: { msg?: string }; message?: string };
              const msg = err.body?.msg || err.message || 'provider error';
              console.warn(`[md] provider=${provider.name} symbol=${symbol} msg=${msg}`);
            }
            continue;
          }
        }
        if (!candles || !candles.length) throw new Error(`Aucune bougie disponible pour ${symbol} ${period.futureIntervalId}`);
        const expiry = now + FutureInvestorCandle.ttl(period);
        FutureInvestorCandle.CACHE.set(key, { expiry, candles });
        return candles;
      } finally {
        FutureInvestorCandle.INFLIGHT.delete(key);
      }
    })();

    FutureInvestorCandle.INFLIGHT.set(key, promise);
    const res = await promise;
    return res.length > limit ? res.slice(res.length - limit) : res;
  }

  async getAsset(
    symbol: string,
    period: CandlestickIntervalEnum,
    before: Date,
    limit: number
  ): Promise<Asset> {
    const candles = await this.getCandles(symbol, period, before, limit);
    const asset: Asset = {
      dates: candles.map((c) => Util.intToLocalDateTime(c.ts)),
      openings: candles.map((c) => c.open),
      closings: candles.map((c) => c.close),
      highs: candles.map((c) => c.high),
      lows: candles.map((c) => c.low),
      volumes: candles.map((c) => c.quoteVol),
    };
    return asset;
  }
}

export { FutureInvestorCandle };
