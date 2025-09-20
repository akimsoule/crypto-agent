export {
  TradingEngine,
  // exports principaux
  MixHoldSideEnum,
  OrderSideEnum,
  // alias pour compatibilité descendante
  MixHoldSideEnum as EngineMixHoldSideEnum,
  OrderSideEnum as EngineOrderSide,
} from "./engine";

export type { Order, Position } from "./engine";
export type { PortfolioStats, RealizedPnLStats, ClosedTrade } from "./engine";
