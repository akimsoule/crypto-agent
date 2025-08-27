import {
  Strategy,
  StrategyParameters,
  MarketCondition,
  MarketAnalysis,
} from "../types";
import { analyzeMarket } from "../analysis";
import { macdStrategy, envStrategy, trailingStopStrategy } from "./basic";
import { andEntryExitStrategy } from "./combined";
import { macd } from "indicatorts";
import { DEFAULT_PERIODS } from "../config";
import { Action, Asset } from "../../../types/lib";

// Ajouter cette variable au niveau du module pour suivre la condition précédente
let previousCondition: MarketCondition | null = null;

export const adaptiveStrategy = (asset: Asset): Strategy => {
  const strategyResult: Strategy = {
    longStrategy: new Array(asset.closings.length).fill(Action.HOLD),
    shortStrategy: new Array(asset.closings.length).fill(Action.HOLD),
    length: asset.closings.length,
  };

  // Commencer après la période minimale requise
  const startIndex = DEFAULT_PERIODS.VOLATILITY;

  for (let i = startIndex; i < asset.closings.length; i++) {
    // Analyser le marché à chaque point dans le temps
    const marketAnalysis = analyzeMarket(asset, DEFAULT_PERIODS.VOLATILITY, i);

    // Calculer les paramètres optimaux pour les conditions actuelles
    const parameters = calculateAdaptiveParameters(marketAnalysis);

    // Sélectionner et configurer la stratégie appropriée
    const currentStrategy = selectAndConfigureStrategy(
      {
        ...asset,
        closings: asset.closings.slice(0, i + 1),
      },
      marketAnalysis.condition,
      parameters
    );

    // Appliquer les signaux de la stratégie sélectionnée
    if (
      currentStrategy.longStrategy[currentStrategy.length - 1] !== Action.HOLD
    ) {
      strategyResult.longStrategy[i] =
        currentStrategy.longStrategy[currentStrategy.length - 1];
      strategyResult.shortStrategy[i] =
        currentStrategy.shortStrategy[currentStrategy.length - 1];
    }
  }

  return strategyResult;
};

const calculateAdaptiveParameters = (
  marketAnalysis: MarketAnalysis
): StrategyParameters => {
  return {
    trending: {
      macd: {
        fast: Math.round(12 * (1 + marketAnalysis.trendStrength / 200)),
        slow: Math.round(26 * (1 + marketAnalysis.trendStrength / 200)),
        signal: 9,
      },
    },
    ranging: {
      env: {
        period: Math.max(
          10,
          Math.round(20 * (1 - marketAnalysis.volatility / 10))
        ),
        lowLevel: Math.max(
          2,
          Math.min(8, 5 * (1 + marketAnalysis.volatility / 5))
        ),
        highLevel: Math.max(
          2,
          Math.min(8, 5 * (1 + marketAnalysis.volatility / 5))
        ),
      },
    },
    volatile: {
      env: {
        period: Math.max(
          5,
          Math.round(20 * (1 - marketAnalysis.volatility / 5))
        ),
        lowLevel: Math.max(
          1,
          Math.min(4, 3 * (1 - marketAnalysis.volatility / 10))
        ),
        highLevel: Math.max(
          1,
          Math.min(4, 3 * (1 - marketAnalysis.volatility / 10))
        ),
      },
      trailingStop: {
        percentage: Math.max(
          1,
          Math.min(5, 3 * (1 + marketAnalysis.volatility / 5))
        ),
      },
    },
  };
};

const selectAndConfigureStrategy = (
  asset: Asset,
  condition: MarketCondition,
  parameters: StrategyParameters
): Strategy => {
  logStrategySelection(condition, parameters);
  switch (condition) {
    case "TRENDING": {
      // Utiliser MACD avec paramètres optimisés pour les tendances
      const customMacd = macd(asset.closings, {
        fast: parameters.trending.macd.fast,
        slow: parameters.trending.macd.slow,
        signal: parameters.trending.macd.signal,
      });
      return macdStrategy(asset, customMacd);
    }

    case "RANGING":
      // Utiliser Enveloppes avec paramètres optimisés pour le range
      return envStrategy(
        asset,
        parameters.ranging.env.period,
        parameters.ranging.env.lowLevel,
        parameters.ranging.env.highLevel
      );

    case "VOLATILE":
      // Combiner Enveloppes et Trailing Stop pour la volatilité
      return andEntryExitStrategy(
        asset,
        envStrategy(
          asset,
          parameters.volatile.env.period,
          parameters.volatile.env.lowLevel,
          parameters.volatile.env.highLevel
        ),
        trailingStopStrategy(asset, parameters.volatile.trailingStop.percentage)
      );

    default:
      // Stratégie par défaut en cas de condition non reconnue
      return envStrategy(asset);
  }
};

// Modifier la fonction logStrategySelection
const logStrategySelection = (
  condition: MarketCondition,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parameters: StrategyParameters
): void => {
  if (condition !== previousCondition) {
    // console.log(
    //   `🔄 Changement de condition de marché: ${
    //     previousCondition ?? "INITIAL"
    //   } -> ${condition}`
    // );
    // console.log('📊 Nouveaux paramètres:', JSON.stringify({
    //   [condition.toLowerCase()]: parameters[condition.toLowerCase()]
    // }, null, 2));
    previousCondition = condition;
  }
};
