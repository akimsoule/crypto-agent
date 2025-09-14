// NOTE: Import initial de Action/Asset retiré pour compatibilité exécution seed (ESM + tsx nested import issue)
// Redéclaration locale minimaliste (alignée avec netlify/trade.app/src/types/lib.ts) pour usage typage.
import { BotParameter } from "../config/BotParameter";
import {
  QuickExitFilter,
  StandardFilter,
  InvestorDevFilter,
  InvestorProdFilter,
  InvestorProdFilterAggressive,
  InvestorProdFilterBalanced,
  InvestorProdFilterConservative,
} from "../filter/Filter";

export enum Action {
  SELL = -1,
  HOLD = 0,
  BUY = 1,
}

export interface Asset {
  dates: Date[];
  openings: number[];
  closings: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
}

type Candlestick = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  quoteVol: number;
  baseVol: number;
};

type Bool = true | false | null;
type Position = MixHoldSideEnum | null;
type IndicatorType =
  | "DOUBLE_AVG"
  | "TRIPLE_AVG"
  | "MACD"
  | "ENV"
  | "OR_MACD_ENV"
  | "TRAILING_STOP"
  | "ADAPTIVE"
  | "ADAPTIVE_WITH_TRAILING";

type Indicator = {
  type: IndicatorType;
  params?: number[];
};

type Params = {
  futureParam: { groups: FutureGroup[] };
  spotParam: { groups: SpotGroup[] };
  profiles: Profile[];
};

type FilterType =
  | StandardFilter
  | QuickExitFilter
  | InvestorDevFilter
  | InvestorProdFilter
  | InvestorProdFilterAggressive
  | InvestorProdFilterBalanced
  | InvestorProdFilterConservative;

interface CommonGroup {
  period: CandlestickIntervalEnum;
  indicator: Indicator;
  exit: Bool;
  filter: FilterType;
  activeLimit: boolean;
  orderSize?: number;
  amountInCrypto?: number;
  amountInUsdt?: number;
  symbols: string[];
}

interface SpotGroup extends CommonGroup {
  position: MixHoldSideEnum.LONG;
}

interface FutureGroup extends CommonGroup {
  position: Position;
  margeLeverage: number;
  marginMode: MixMarginModeEnum;
}

type Group = SpotGroup | FutureGroup;

type TradeParam = {
  botParameter: BotParameter;
  asset: Asset;
  action: Action;
  closings: number[];
  position: JSONObject;
  positionCompl: JSONObject;
  symbol: string;
  activeLimit: boolean;
  group: FutureGroup | SpotGroup;
  lastOrder: JSONObject;
  mixHoldSideEnum: MixHoldSideEnum;
  currentPrice: number;
  index: number;
};

type TrainedData = {
  openings: number;
  highs: number;
  lows: number;
  volumes: number;
  closings: number;
  sma5: number;
  sma10: number;
  sma100: number;
  macdLine: number;
  signalLine: number;
  rsi: number;
  ao: number;
  upperBand: number;
  lowerBand: number;
  bandWidth: number;
  stochK: number;
  stochD: number;
  atrLine: number;
  trLine: number;
  priceVolatility: number;
  volumeChange: number;
  futureOpenings: number;
  futureHighs: number;
  futureLows: number;
  futureClosings: number;
  futureVolumes: number;
};

type TrainedIndicator = {
  // Moyennes mobiles
  sma5: number[];
  sma10: number[];
  sma100: number[];

  // MACD
  macd: {
    macdLine: number[];
    signalLine: number[];
  };

  // Oscillateurs
  rsi: number[];
  ao: number[];

  // Bandes de Bollinger
  bollinger: {
    upper: number[];
    middle: number[];
    lower: number[];
  };

  // Stochastique
  stochastic: {
    k: number[];
    d: number[];
  };

  // Volatilité
  atr: {
    trLine: number[];
    atrLine: number[];
  };
};

type JSONValue = number | string | Date | boolean | JSONObject | JSONArray;

interface JSONObject {
  [x: string]: JSONValue;
}

type JSONArray = Array<JSONObject>;
// Use Array<JSONObject> directly instead of JSONArray interface

enum MixHoldSideEnum {
  LONG = "long",
  SHORT = "short",
}

class CandlestickIntervalEnum {
  static readonly ONE_MINUTE = new CandlestickIntervalEnum("1m", "1min");
  static readonly FIVE_MINUTES = new CandlestickIntervalEnum("5m", "5min");
  static readonly FIFTEEN_MINUTES = new CandlestickIntervalEnum("15m", "15min");
  static readonly HALF_HOURLY = new CandlestickIntervalEnum("30m", "30min");
  static readonly HOURLY = new CandlestickIntervalEnum("1H", "1h");
  static readonly TWO_HOURLY = new CandlestickIntervalEnum("2H", "2h");
  static readonly FOUR_HOURLY = new CandlestickIntervalEnum("4H", "4h");
  static readonly SIX_HOURLY = new CandlestickIntervalEnum("6H", "6h");
  static readonly TWELVE_HOURLY = new CandlestickIntervalEnum("12H", "12h");
  static readonly DAILY = new CandlestickIntervalEnum("1D", "1day");
  static readonly WEEKLY = new CandlestickIntervalEnum("1W", "1week");
  static readonly MONTHLY = new CandlestickIntervalEnum("1M", "1M");

  futureIntervalId: string;
  spotIntervalId: string;

  constructor(futureIntervalId: string, spotIntervalId: string) {
    this.futureIntervalId = futureIntervalId;
    this.spotIntervalId = spotIntervalId;
  }
}

enum MixQueryPlanEnum {
  PLAN = "plan",
  PROFIT_LOSS = "profit_loss",
}

enum MixPlanTypeEnum {
  NORMAL_PLAN = "normal_plan",
  PROFIT_PLAN = "profit_plan",
  LOSS_PLAN = "loss_plan",
  MOVING_PLAN = "moving_plan",
  TRACK_PLAN = "track_plan",
  POS_PROFIT = "pos_profit",
  POS_LOSS = "pos_loss",
}

enum MixMarginModeEnum {
  CROSSED = "crossed",
  FIXED = "fixed",
}

enum OrderSideEnum {
  BUY = "buy",
  SELL = "sell",
}

enum TradeSideEnum {
  OPEN = "open",
  CLOSE = "close",
}

enum Profile {
  SIM = "simulation",
  DEV = "development",
  PROD = "production",
  TEST = "test",
  FUTURE = "futures",
  SPOT = "spot",
  DEBUG = "debug",
}

// Types d'investisseurs supportés (extensible)
type InvestorType =
  | "conservative"
  // Nouveau type (synonyme de balanced mais avec plage de risque explicite)
  | "moderate"
  | "balanced"
  | "aggressive"
  | "momentum"
  | "contrarian"
  | "trend_sniper"
  | "stable_seeker"
  | "degen"
  | "microcap"
  | "sentiment"
  | "ath_rebound"
  | "macd_master"
  | "envelope_strategist"
  // Nouveaux archétypes inspirés de la description fonctionnelle
  | "active_trader"          // Investisseur Actif / Trader
  | "speculative_gem"        // Spéculatif / Chasseur de Gems
  | "institutional"          // Investisseur Institutionnel
  | "defi"                   // Investisseur Blockchain / DeFi
  | "sustainable"            // Investisseur Crypto Durable / Éthique
  | (string & {});


export {
  Params,
  CandlestickIntervalEnum,
  Bool,
  Group,
  FilterType,
  Indicator,
  IndicatorType,
  TrainedData,
  TrainedIndicator,
  JSONArray,
  BotParameter,
  QuickExitFilter,
  JSONObject,
  JSONValue,
  TradeParam,
  Candlestick,
  FutureGroup,
  SpotGroup,
  MixHoldSideEnum,
  MixPlanTypeEnum,
  MixQueryPlanEnum,
  MixMarginModeEnum,
  OrderSideEnum,
  TradeSideEnum,
  InvestorType,
  Profile,
};
