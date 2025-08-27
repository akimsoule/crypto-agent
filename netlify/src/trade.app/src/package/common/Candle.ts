import { Asset } from "../../types/lib";
import { CandlestickIntervalEnum } from "./MapperType";

interface Candle {
  getAsset(
    symbol: string,
    period: CandlestickIntervalEnum,
    date: Date,
    limit: number
  ): Promise<Asset>;
}

export { Candle };
