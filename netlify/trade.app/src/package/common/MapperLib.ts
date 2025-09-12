import {
  CandlestickIntervalEnum,
  MixHoldSideEnum,
  MixMarginModeEnum,
  IndicatorType,
} from "./MapperType";

// Mapping des périodes pour les bougies
export const PERIOD_MAP: Record<string, CandlestickIntervalEnum> = {
  "15M": CandlestickIntervalEnum.FIFTEEN_MINUTES,
  "30M": CandlestickIntervalEnum.HALF_HOURLY,
  "1H": CandlestickIntervalEnum.HOURLY,
  "4H": CandlestickIntervalEnum.FOUR_HOURLY,
};

/**
 * Convertit une chaîne de période en énumération CandlestickInterval
 * @param p - La période sous forme de chaîne
 * @returns La période sous forme d'énumération
 */
export function mapPeriod(p?: string | null): CandlestickIntervalEnum {
  if (!p) return CandlestickIntervalEnum.HOURLY;
  return PERIOD_MAP[p.toUpperCase()] || CandlestickIntervalEnum.HOURLY;
}

/**
 * Convertit une chaîne de position en énumération MixHoldSide
 * @param pos - La position sous forme de chaîne
 * @returns La position sous forme d'énumération
 */
export function mapPosition(pos?: string | null): MixHoldSideEnum | null {
  if (!pos) return MixHoldSideEnum.LONG; // défaut historique
  const up = pos.toUpperCase();
  if (up === "LONG") return MixHoldSideEnum.LONG;
  if (up === "SHORT") return MixHoldSideEnum.SHORT;
  return MixHoldSideEnum.LONG;
}

/**
 * Convertit une chaîne de mode de marge en énumération MixMarginMode
 * @param m - Le mode de marge sous forme de chaîne
 * @returns Le mode de marge sous forme d'énumération
 */
export function mapMarginMode(m?: string | null): MixMarginModeEnum {
  if (!m) return MixMarginModeEnum.CROSSED;
  const up = m.toLowerCase();
  if (up === "fixed" || up === "isolated") return MixMarginModeEnum.FIXED; // support alias
  return MixMarginModeEnum.CROSSED;
}

/**
 * Normalise une liste de symboles en enlevant le suffixe USDT
 * @param symbols - La liste des symboles
 * @returns La liste des symboles normalisés
 */
export function normalizeSymbols(symbols?: string[] | null): string[] {
  if (!symbols || symbols.length === 0) return ["BTC", "ETH", "XRP"]; // fallback
  return symbols.map((s) => s.replace(/USDT$/i, ""));
}

/**
 * Convertit une chaîne de type d'indicateur en IndicatorType
 * @param type - Le type d'indicateur sous forme de chaîne
 * @returns Le type d'indicateur
 */
export function mapIndicator(type?: string | null): IndicatorType {
  // On fait confiance aux valeurs seedées; fallback safe
  return (type as IndicatorType) || ("OR_MACD_ENV" as IndicatorType);
}
