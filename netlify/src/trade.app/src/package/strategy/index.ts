import { Asset } from "../../types/lib";
import { Strategy } from "./types";
import { IndicatorType } from "../common/MapperType";
import {
  macdStrategy,
  envStrategy,
  doubleEmaStrategy,
  tripleEmaStrategy,
  trailingStopStrategy,
  rsiStrategy,
} from "./strategies/basic";
import { adaptiveStrategy } from "./strategies/adaptive";
import {
  andStrategy,
  orStrategy,
  andEntryExitStrategy,
} from "./strategies/combined";

export * from "./types";
export * from "./analysis";
export * from "./strategies/basic";
export * from "./strategies/combined";
export * from "./strategies/adaptive";

// Configuration des stratégies de base
const BASE_STRATEGIES = [
  { name: "macd", strategy: macdStrategy },
  { name: "rsi", strategy: rsiStrategy },
  { name: "env", strategy: envStrategy },
  { name: "doubleEma", strategy: doubleEmaStrategy },
  { name: "tripleEma", strategy: tripleEmaStrategy },
  { name: "trailingStop", strategy: trailingStopStrategy },
  { name: "adaptive", strategy: adaptiveStrategy },
] as const;

// Fonction utilitaire pour générer les combinaisons
const generateCombinations = <T>(arr: T[], size: number): T[][] => {
  if (size === 1) return arr.map((value) => [value]);

  const combinations: T[][] = [];

  arr.forEach((value, index) => {
    const smallerCombinations = generateCombinations(
      arr.slice(index + 1),
      size - 1
    );
    smallerCombinations.forEach((combination) => {
      combinations.push([value, ...combination]);
    });
  });

  return combinations;
};

// Génération des stratégies de base
export const getBaseStrategies = (asset: Asset) => {
  return BASE_STRATEGIES.map(({ name, strategy }) => ({
    name,
    strategy: strategy(asset),
  }));
};

// Génération des combinaisons OR
export const generateOrCombineStrategies = (
  asset: Asset,
  numberOfStrategies: number
): Array<{ name: string; strategy: Strategy }> => {
  const baseStrategies = BASE_STRATEGIES.map((s) => s.strategy);
  const combinations = generateCombinations(baseStrategies, numberOfStrategies);

  return combinations.map((stratCombination) => ({
    name: `or_${stratCombination.map((s) => s.name).join("_")}`.replaceAll(
      "Strategy",
      ""
    ),
    strategy: orStrategy(
      asset,
      stratCombination.map((s) => s(asset))
    ),
  }));
};

// Génération des combinaisons AND
export const generateAndCombineStrategies = (
  asset: Asset,
  numberOfStrategies: number
): Array<{ name: string; strategy: Strategy }> => {
  const baseStrategies = BASE_STRATEGIES.map((s) => s.strategy);
  const combinations = generateCombinations(baseStrategies, numberOfStrategies);

  return combinations.map((stratCombination) => ({
    name: `and_${stratCombination.map((s) => s.name).join("_")}`.replaceAll(
      "Strategy",
      ""
    ),
    strategy: andStrategy(
      asset,
      stratCombination.map((s) => s(asset))
    ),
  }));
};

// Obtention de toutes les stratégies
export const getStrategies = (asset: Asset) => {
  return [
    ...getBaseStrategies(asset),
    ...generateOrCombineStrategies(asset, 2),
    ...generateOrCombineStrategies(asset, 3),
    ...generateAndCombineStrategies(asset, 2),
    ...generateAndCombineStrategies(asset, 3),
    // Stratégies avec trailing stop
    ...BASE_STRATEGIES.filter((s) => s.name !== "trailingStop").map(
      ({ name, strategy }) => ({
        name: `${name}Trailing`,
        strategy: andEntryExitStrategy(
          asset,
          strategy(asset),
          trailingStopStrategy(asset)
        ),
      })
    ),
    // Stratégies adaptatives combinées
    {
      name: "adaptive_with_trailing",
      strategy: andEntryExitStrategy(
        asset,
        adaptiveStrategy(asset),
        trailingStopStrategy(asset)
      ),
    },
    {
      name: "adaptive_with_env",
      strategy: andStrategy(asset, [
        adaptiveStrategy(asset),
        envStrategy(asset),
      ]),
    },
    {
      name: "adaptive_with_macd",
      strategy: andStrategy(asset, [
        adaptiveStrategy(asset),
        macdStrategy(asset),
      ]),
    },
  ];
};

// Point d'entrée principal pour obtenir une stratégie spécifique
export const getStrategy = (
  asset: Asset,
  type: IndicatorType,
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: number[] = []
): Strategy => {
  const strategies = {
    ADAPTIVE_WITH_TRAILING: () =>
      andEntryExitStrategy(
        asset,
        adaptiveStrategy(asset),
        trailingStopStrategy(asset)
      ),
    ADAPTIVE: () => adaptiveStrategy(asset),
    DOUBLE_AVG: () => doubleEmaStrategy(asset),
    TRIPLE_AVG: () => tripleEmaStrategy(asset),
    MACD: () => macdStrategy(asset),
    ENV: () => envStrategy(asset),
    OR_MACD_ENV: () =>
      orStrategy(asset, [macdStrategy(asset), envStrategy(asset)]),
    TRAILING_STOP: () => trailingStopStrategy(asset),
  };

  return (strategies[type] || strategies.ADAPTIVE)();
};

export type { Strategy, IndicatorType };
