import {
  CandlestickIntervalEnum,
  FutureGroup,
  IndicatorType,
  MixHoldSideEnum,
  MixMarginModeEnum,
  Profile,
} from "../common/MapperType";
import {
  getPeriods,
  getStrategies,
  getExitPossibilities,
  getPositions,
  investorFilters,
  getLeverageRange,
  getMarginModes,
  getRiskMinRange,
  getRiskMaxRange,
  getSymbols,
} from "./InvestorPresets";
// Filtres résolus via investorFilters (depuis InvestorPresets)

type SeedInvestorLike = { id?: string; name?: string; type?: string };

type InvestorComposition = {
  profiles: Profile[];
  futureParam: { groups: FutureGroup[] };
  spotParam: { groups: [] };
  // alias pratique pour le seed
  groups: FutureGroup[];
  // plage de risque optionnelle exposée pour la persistance
  riskRange?: [number, number];
};

function toUsdtPair(sym: string): string {
  // Si le symbole fourni contient déjà USDT, le laisser tel quel
  if (/USDT$/.test(sym)) return sym;
  return `${sym}USDT`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0; // 32-bit
  }
  return Math.abs(h);
}

function pickByIndex<T>(arr: T[], idxSeed: number, fallback: T): T {
  if (!arr || arr.length === 0) return fallback;
  const idx = idxSeed % arr.length;
  return arr[idx];
}

function mapTypeToFilter(type: string | undefined) {
  const t = (type || "").toLowerCase();
  // Mapping simple -> filtres investisseurs (prod)
  if (t.includes("conserv")) return investorFilters.conservative;
  if (t.includes("balance") || t.includes("moderate") || t.includes("moderate"))
    return investorFilters.balanced;
  if (t.includes("aggress") || t.includes("degen"))
    return investorFilters.aggressive;

  // Quelques archétypes -> mapping par défaut
  if (t.includes("institution")) return investorFilters.conservative;
  if (t.includes("stable")) return investorFilters.conservative;
  if (t.includes("trend") || t.includes("momentum"))
    return investorFilters.balanced;
  if (t.includes("microcap") || t.includes("speculative"))
    return investorFilters.aggressive;

  // fallback équilibré
  return investorFilters.balanced;
}

export class InvestorFactory {
  static fromInvestor(
    investor: SeedInvestorLike,
    inputSymbols: string[] = [],
    options: Partial<{ leverage: number }> = {}
  ): InvestorComposition {
    const seedStr = `${investor.type || ""}-${investor.name || ""}`;
    const seedIdx = hashCode(seedStr);

    // Support explicite d'un strategyName encodé dans investor.name ou type
    // Pattern attendu: macd_set_<fast>_<slow>_<signal> ou macd_<symbol> avec strategyName stocké ailleurs.
    // On tente aussi de détecter la forme MACD_<fast>_<slow>_<signal> passée via options.strategyName (future extension possible).
    type StrategyLike = { type: IndicatorType; params?: number[] };
    let explicitIndicator: StrategyLike | null = null;
    const macdParamRegex = /MACD_(\d+)_(\d+)_(\d+)/i;
    // Chercher d'abord dans le name
    if (investor.name && macdParamRegex.test(investor.name)) {
      const m = investor.name.match(macdParamRegex);
      if (m) {
        explicitIndicator = {
          type: "MACD",
          params: [Number(m[1]), Number(m[2]), Number(m[3])],
        };
      }
    }
    // Puis dans le type si rien trouvé
    if (
      !explicitIndicator &&
      investor.type &&
      macdParamRegex.test(investor.type)
    ) {
      const m = investor.type.match(macdParamRegex);
      if (m) {
        explicitIndicator = {
          type: "MACD",
          params: [Number(m[1]), Number(m[2]), Number(m[3])],
        };
      }
    }

    // Symbols: utiliser ceux fournis, sinon les presets
    const baseSymbols = inputSymbols.length > 0 ? inputSymbols : getSymbols();
    const symbols = baseSymbols.map(toUsdtPair);

    // Sélections via getters
    const periods = getPeriods();
    const strategies = getStrategies();
    const exits = getExitPossibilities();
    const positions = getPositions();
    const marginModes = getMarginModes();
    const [levMin, levMax] = getLeverageRange();

    const period: CandlestickIntervalEnum = pickByIndex(
      periods,
      seedIdx,
      CandlestickIntervalEnum.HOURLY
    );
    const strategy: StrategyLike =
      explicitIndicator ||
      (pickByIndex(strategies, seedIdx, {
        type: "MACD" as IndicatorType,
      }) as StrategyLike);
    const exit = pickByIndex(exits, seedIdx, false);
    const position = pickByIndex<MixHoldSideEnum | null>(
      positions,
      seedIdx,
      null
    );
    const marginMode = pickByIndex(
      marginModes,
      seedIdx,
      MixMarginModeEnum.CROSSED
    );

    const leverage = options.leverage
      ? Math.max(levMin, Math.min(options.leverage, levMax))
      : Math.min(levMax, Math.max(levMin, 5));

    // Filtre investisseur uniquement
    const filter = mapTypeToFilter(investor.type);

    // Risk range à partir des getters
    const riskMins = getRiskMinRange();
    const riskMaxs = getRiskMaxRange();
    let riskRange: [number, number] | undefined;
    if (riskMins.length && riskMaxs.length) {
      const min = pickByIndex(riskMins, seedIdx, riskMins[0]);
      const max = pickByIndex(riskMaxs, seedIdx, riskMaxs[riskMaxs.length - 1]);
      riskRange = [Math.min(min, max), Math.max(min, max)];
    }

    const group: FutureGroup = {
      period,
      indicator: strategy.params
        ? { type: strategy.type, params: strategy.params }
        : { type: strategy.type },
      exit,
      filter,
      activeLimit: false,
      orderSize: undefined,
      symbols,
      position,
      margeLeverage: leverage,
      marginMode,
    } as unknown as FutureGroup;

    const groups: FutureGroup[] = [group];

    return {
      profiles: [Profile.FUTURE],
      futureParam: { groups },
      spotParam: { groups: [] },
      groups,
      riskRange,
    };
  }
}

export default InvestorFactory;
