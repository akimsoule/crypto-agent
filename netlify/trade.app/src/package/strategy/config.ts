export const DEFAULT_PERIODS = {
  FAST_EMA: 12,
  SLOW_EMA: 26,
  SIGNAL: 9,
  VOLATILITY: 14,
  ENV: 20
};

export const THRESHOLDS = {
  VOLATILITY: 1.5,           // Réduit de 2 à 1.5
  TREND_STRENGTH: 55,        // Réduit de 60 à 55
  MIN_ENV_PERIOD: 5,
  MAX_ENV_PERIOD: 20,
  MIN_TRAILING_STOP: 1,
  MAX_TRAILING_STOP: 5
} as const;