import { Asset } from "../../types/lib";
import { MarketAnalysis, MarketCondition } from "./types";
import { DEFAULT_PERIODS, THRESHOLDS } from "./config";

export const calculateVolatility = (
  prices: number[],
  period: number = DEFAULT_PERIODS.VOLATILITY,
  currentIndex: number
): number => {
  if (prices.length < period) return 0;

  // Utiliser une fenêtre glissante
  const startIndex = Math.max(0, currentIndex - period + 1);
  const windowPrices = prices.slice(startIndex, currentIndex + 1);

  const returns = windowPrices
    .slice(1)
    .map((price, i) => ((price - windowPrices[i]) / windowPrices[i]) * 100);

  const avgReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
  const variance =
    returns.reduce((sum, val) => sum + Math.pow(val - avgReturn, 2), 0) /
    (returns.length - 1);

  return Math.sqrt(variance);
};

export const calculateTrendStrength = (
  prices: number[],
  period: number = DEFAULT_PERIODS.VOLATILITY,
  currentIndex: number
): number => {
  if (prices.length < period) return 0;

  // Utiliser une fenêtre glissante
  const startIndex = Math.max(0, currentIndex - period + 1);
  const windowPrices = prices.slice(startIndex, currentIndex + 1);

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < windowPrices.length; i++) {
    const diff = windowPrices[i] - windowPrices[i - 1];
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const RS = avgGain / avgLoss;
  return 100 - 100 / (1 + RS);
};

export const analyzeMarket = (
  asset: Asset,
  period: number = DEFAULT_PERIODS.VOLATILITY,
  currentIndex: number = asset.closings.length - 1
): MarketAnalysis => {
  const volatility = calculateVolatility(asset.closings, period, currentIndex);
  const trendStrength = calculateTrendStrength(
    asset.closings,
    period,
    currentIndex
  );

  let condition: MarketCondition;
  if (volatility > THRESHOLDS.VOLATILITY && trendStrength < 45) {
    condition = "VOLATILE";
  } else if (
    trendStrength > THRESHOLDS.TREND_STRENGTH ||
    (trendStrength > 50 && volatility < THRESHOLDS.VOLATILITY)
  ) {
    condition = "TRENDING";
  } else {
    condition = "RANGING";
  }

  // Logs améliorés pour un suivi plus clair
  //   console.log({
  //     volatility: volatility.toFixed(2),
  //     trendStrength: trendStrength.toFixed(2),
  //     condition,
  //   });

  return { volatility, trendStrength, condition };
};

// Exemple d'utilisation dans une stratégie
export const getMarketConditions = (asset: Asset): MarketCondition[] => {
  const conditions: MarketCondition[] = new Array(asset.closings.length);

  for (let i = DEFAULT_PERIODS.VOLATILITY; i < asset.closings.length; i++) {
    const analysis = analyzeMarket(asset, DEFAULT_PERIODS.VOLATILITY, i);
    conditions[i] = analysis.condition;
  }

  return conditions;
};
