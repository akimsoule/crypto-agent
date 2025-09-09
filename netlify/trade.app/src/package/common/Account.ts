import { StandardFilter } from "../filter/Filter";
import {
  CandlestickIntervalEnum,
  Group,
  JSONArray,
  JSONObject,
  MixHoldSideEnum,
  MixMarginModeEnum,
  MixPlanTypeEnum,
  MixQueryPlanEnum,
  OrderSideEnum,
} from "./MapperType";

class CommonUtils {
  group: Group = {
    period: CandlestickIntervalEnum.HOURLY,
    indicator: { type: "MACD", params: [12, 26, 9] },
    activeLimit: false,
    exit: null,
    position: MixHoldSideEnum.LONG,
    margeLeverage: 0,
    marginMode: MixMarginModeEnum.CROSSED,
    symbols: [],
    filter: new StandardFilter(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public cache: { [key: string]: any } = {};

  public async fetchWithCache(
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchFunction: () => Promise<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    if (this.cache[key]) {
      return this.cache[key];
    }
    const data = await fetchFunction();
    this.cache[key] = data;
    return data;
  }
}

interface Common extends CommonUtils {
  getCurrentPosition(
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<JSONObject>;

  getAllPositions(): Promise<JSONArray>;

  getHistoryPositions(symbol: string): Promise<JSONArray>;

  getLastOrder(
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<JSONObject>;

  getCurrentPrice(symbol: string): Promise<number>;

  getQtyToInvest(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<number>;

  setGroup(group: Group): void;

  getGroup(): Group;
}

interface Market {
  entry(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean>;

  exit(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean>;

  exitIfPL(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean>;
}

interface Limit {
  takeLimit(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    orderSideEnum: OrderSideEnum
  ): Promise<boolean>;

  cancelLimit(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    orderSideEnum: OrderSideEnum
  ): Promise<boolean>;
}

interface Plan {
  stopLoss(
    symbol: string,
    triggerPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): void;
  getCurrentPlan(
    symbol: string,
    mixQueryPlanEnum: MixQueryPlanEnum,
    mixPlanTypeEnum: MixPlanTypeEnum
  ): string;
  cancelPlan(
    orderId: string,
    symbol: string,
    mixPlanTypeEnum: MixPlanTypeEnum
  ): void;
  takeProfit(
    symbol: string,
    takeProfit: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): void;
  trailingStop(
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum,
    triggerPrice: number,
    rangeRateForTakeProfit: number
  ): void;
}

interface Copy {
  exitAllCopyIfPL(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean>;
  exitAllCopy(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean>;
  exitCopy(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    posObj: JSONObject
  ): Promise<boolean>;
}

interface Account extends Market, Limit, Plan, Copy, Common {}


export {
  Account,
  Market,
  Limit,
  Plan,
  Copy,
  Common,
  CommonUtils
};
