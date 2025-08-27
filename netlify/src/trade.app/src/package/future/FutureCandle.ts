import { Candle } from "../common/Candle";
import { Candlestick, CandlestickIntervalEnum } from "../common/MapperType";
import {
  FuturesCandlesRequestV2,
  FuturesKlineInterval,
  FuturesProductTypeV2,
} from "bitget-api";
import { Util } from "../common/Util";
import { Config } from "../common/Config";
import { Asset } from "../../types/lib";

class FutureCandle implements Candle {
  config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  getCandles = async (
    symbol: string,
    period: CandlestickIntervalEnum,
    before: Date,
    limit: number
  ): Promise<Candlestick[]> => {
    let candlesticks: Candlestick[] = [];
    let count = 0;
    let currentBefore: Date = new Date();

    while (before !== currentBefore && count < limit) {
      currentBefore = before;
      const params: FuturesCandlesRequestV2 = {
        symbol: this.config.botParameter.getSymbolV2(symbol),
        productType:
          this.config.botParameter.getProductType() as FuturesProductTypeV2,
        granularity: period.futureIntervalId as FuturesKlineInterval,
        limit: "100",
        endTime: before.getTime().toString(),
      };
      const paramsType: FuturesCandlesRequestV2 =
        params as FuturesCandlesRequestV2;
      const data = (
        await this.config.bitgetClientV2.getFuturesCandles(paramsType)
      ).data as unknown as number[][];

      const newCandlesticks = data.map((array) => {
        const candle: Candlestick = {
          ts: Number(array[0]),
          open: Number(array[1]),
          high: Number(array[2]),
          low: Number(array[3]),
          close: Number(array[4]),
          quoteVol: Number(array[5]),
          baseVol: Number(array[6]),
        };
        return candle;
      });

      if (newCandlesticks instanceof Array && newCandlesticks.length === 0) {
        limit = count;
        break;
      }
      candlesticks.push(...newCandlesticks);
      candlesticks.sort((o1, o2) => o2.ts - o1.ts);
      count = candlesticks.length;
      before = Util.intToLocalDateTime(
        candlesticks[candlesticks.length - 1].ts
      );
    }

    if (candlesticks.length !== 0 && candlesticks.length > limit) {
      candlesticks = candlesticks.slice(0, limit);
    }

    candlesticks.sort((o1, o2) => o1.ts - o2.ts);

    return candlesticks;
  };

  getAsset = async (
    symbol: string,
    period: CandlestickIntervalEnum,
    before: Date,
    limit: number
  ): Promise<Asset> => {
    const candles = await this.getCandles(symbol, period, before, limit);

    const asset: Asset = {
      dates: candles.map((candlestick: Candlestick) =>
        Util.intToLocalDateTime(candlestick.ts)
      ),
      openings: candles.map((candlestick: Candlestick) => candlestick.open),
      closings: candles.map((candlestick: Candlestick) => candlestick.close),
      highs: candles.map((candlestick: Candlestick) => candlestick.high),
      lows: candles.map((candlestick: Candlestick) => candlestick.low),
      volumes: candles.map((candlestick: Candlestick) => candlestick.quoteVol),
    };

    return asset;
  };
}

export { FutureCandle };
