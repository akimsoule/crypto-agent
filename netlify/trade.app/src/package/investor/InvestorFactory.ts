// Allégé: la logique initiale volumineuse est déplacée dans InvestorPresets.
// Ce fichier expose une API stable en construisant les groupes à la volée.

import {
  CandlestickIntervalEnum,
  FutureGroup,
  MixHoldSideEnum,
  MixMarginModeEnum,
  Params,
  Profile,
  SpotGroup,
  InvestorType,
  IndicatorType,
} from "../common/MapperType";
import {
  StandardFilter,
  StandardFilterWithoutRoi,
  StandardFilterWithoutNotFar,
  QuickExitFilter,
  DevFilter,
} from "../filter/Filter";
import { PRESETS } from "./InvestorPresets";

export type StrategySpec = { type: IndicatorType; params?: number[] };
export interface InvestorFactoryOptions {
  name: string;
  symbols: string[];
  strategies: StrategySpec[];
  filters?: (
    | StandardFilter
    | StandardFilterWithoutRoi
    | StandardFilterWithoutNotFar
    | QuickExitFilter
    | DevFilter
  )[]; // compat typé
  period?: CandlestickIntervalEnum;
  position?: MixHoldSideEnum | null;
  leverage?: number;
  marginMode?: MixMarginModeEnum;
  exit?: boolean | null;
  activeLimit?: boolean;
  profiles?: Profile[];
  riskRange?: [number, number];
}

export interface InvestorComposition {
  name: string;
  params: Params;
  groups: FutureGroup[];
  riskRange?: [number, number];
}

export class InvestorFactory {
  static buildGroups(o: InvestorFactoryOptions): FutureGroup[] {
    const period = o.period ?? CandlestickIntervalEnum.HOURLY;
    const position = o.position ?? MixHoldSideEnum.LONG;
    const filters = (o.filters?.length ? o.filters : [new StandardFilter()]);
    const leverage = o.leverage ?? 5;
    const marginMode = o.marginMode ?? MixMarginModeEnum.CROSSED;
    const exit = o.exit === true ? true : null;
    const activeLimit = o.activeLimit ?? false;
    const groups: FutureGroup[] = [];
    for (const strat of o.strategies) {
      for (const filter of filters) {
        groups.push({
          period,
            indicator: { type: strat.type, params: strat.params },
            exit,
            position,
            activeLimit,
            filter,
            margeLeverage: leverage,
            marginMode,
            symbols: [...o.symbols],
        });
      }
    }
    return groups;
  }

  static buildParams(o: InvestorFactoryOptions): InvestorComposition {
    const groups = this.buildGroups(o);
    const profiles = o.profiles ?? [Profile.FUTURE, Profile.DEV];
    const params: Params = {
      futureParam: { groups },
      spotParam: { groups: [] as SpotGroup[] },
      profiles,
    };
    return { name: o.name, params, groups, riskRange: o.riskRange };
  }

  static fromInvestor(
    investor: { id: string; name: string; type: string },
    symbols: string[],
    overrides?: Partial<InvestorFactoryOptions & { strategies: StrategySpec[] }>
  ): InvestorComposition {
    const preset = PRESETS[investor.type as InvestorType] ?? PRESETS["balanced"];
    const strategies = overrides?.strategies ?? preset.strategies;
    const filters = overrides?.filters ?? preset.filters;
    const period = overrides?.period ?? preset.period;
    const position = overrides?.position ?? preset.position ?? MixHoldSideEnum.LONG;
    const leverage = overrides?.leverage ?? preset.leverage;
    const marginMode = overrides?.marginMode ?? preset.marginMode;
    const exit = overrides?.exit ?? preset.exit;
    const activeLimit = overrides?.activeLimit ?? preset.activeLimit;
    const profiles = overrides?.profiles ?? preset.profiles;
    const riskRange = overrides?.riskRange ?? preset.riskRange;
    return this.buildParams({
      name: investor.name,
      symbols,
      strategies,
      filters,
      period,
      position,
      leverage,
      marginMode,
      exit,
      activeLimit,
      profiles,
      riskRange,
    });
  }
}

