import { macd } from 'indicatorts';

// Calcule l'enveloppe sur une série de prix (simple moving average +/- %)
export function computeEnvelope(prices: number[], period = 20, percent = 0.025) {
  if (prices.length < period) return null;
  // Moyenne mobile simple
  const sma = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
  const upper = sma * (1 + percent);
  const lower = sma * (1 - percent);
  return { sma, upper, lower };
}

// Calcule le MACD sur une série de prix
export function computeMACD(prices: number[], config = { fast: 12, slow: 26, signal: 9 }) {
  if (prices.length < (config.slow ?? 26) + (config.signal ?? 9)) return null;
  const result = macd(prices, config);
  // On retourne le dernier point des deux courbes
  const lastMacd = result.macdLine[result.macdLine.length - 1];
  const lastSignal = result.signalLine[result.signalLine.length - 1];
  return { macd: lastMacd, signal: lastSignal };
}
