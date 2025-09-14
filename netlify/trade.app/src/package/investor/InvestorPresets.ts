import {
  CandlestickIntervalEnum,
  IndicatorType,
  MixHoldSideEnum,
  MixMarginModeEnum,
} from "../common/MapperType";
import {
  createInvestorProdFilters,
} from "../filter/Filter";


export const getSymbols = (): string[] => {
  return [
    ...new Set([
      "ETH", "BNB", "SOL",
      "XRP", "XLM",
      "USDC",
      "BTC",
      "UNI", "AAVE", "CRV", "COMP", "MKR",
      "APE", "MANA", "SAND",
      "RNDR", "FET", "GRT", "INJ", "AGIX",
      "ADA", "AVAX",
      "LTC", "BCH",
      "XMR", "ZEC",
    ]),
  ];
}

export const getPeriods = () : CandlestickIntervalEnum[] => {
  return [
    CandlestickIntervalEnum.FIFTEEN_MINUTES,
    CandlestickIntervalEnum.HALF_HOURLY,
    CandlestickIntervalEnum.HOURLY,
    CandlestickIntervalEnum.FOUR_HOURLY,
    CandlestickIntervalEnum.DAILY,
  ];
}

export const getStrategies = () : { type: IndicatorType }[] => {
  return [
    { type: "MACD" as IndicatorType },
    { type: "ENV" as IndicatorType },
    { type: "OR_MACD_ENV" as IndicatorType },
    { type: "DOUBLE_AVG" as IndicatorType },
    { type: "TRIPLE_AVG" as IndicatorType },
    { type: "ADAPTIVE" as IndicatorType },
    { type: "ADAPTIVE_WITH_TRAILING" as IndicatorType },
  ];
}

export const getExitPossibilities = () : (null)[] => {
  return [null];
}

export const getPositions = () : (MixHoldSideEnum | null)[] => {
  return [MixHoldSideEnum.LONG, MixHoldSideEnum.SHORT, null];
}

export const investorFilters = createInvestorProdFilters();

export const getLeverageRange = () : number[] => {
  return [1, 15];
}

export const getMarginModes = () : MixMarginModeEnum[] => {
  return [MixMarginModeEnum.CROSSED, MixMarginModeEnum.FIXED];
}

export const getInitialBalanceRange = () : [number, number] => {
  return [5000, 10000];
}


export const getMaxPositionSizeRange = () : [number, number] => {
  return [0.1, 0.5];
}

export const getRiskToleranceRanges = () : [number, number] => {
  return [0.005, 0.035];
}

export const getRiskMinRange = () : number[] => {
  return [0, 0.8];
}

export const getRiskMaxRange = () : number[] => {
  return [0.2, 1];
}

