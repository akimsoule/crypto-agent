import { Candlestick, CandlestickIntervalEnum } from "../../common/MapperType";

export interface MarketDataProvider {
  name: string;
  getCandles(symbol: string, period: CandlestickIntervalEnum, limit: number): Promise<Candlestick[]>;
  isAvailable(): boolean; // simple flag/circuit-breaker if needed
}
