import { Action } from "../../types/lib";

export type Strategy = {
  longStrategy: Action[];
  shortStrategy: Action[];
  length: number;
};

export type MarketCondition = 'TRENDING' | 'RANGING' | 'VOLATILE';

export interface MarketAnalysis {
  volatility: number;
  trendStrength: number;
  condition: MarketCondition;
}

export interface StrategyParameters {
  trending: {
    macd: {
      fast: number;
      slow: number;
      signal: number;
    };
  };
  ranging: {
    env: {
      period: number;
      lowLevel: number;
      highLevel: number;
    };
  };
  volatile: {
    env: {
      period: number;
      lowLevel: number;
      highLevel: number;
    };
    trailingStop: {
      percentage: number;
    };
  };
}