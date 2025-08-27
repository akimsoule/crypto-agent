import { macd, ema, rsi } from "indicatorts";
import { Action, Asset } from "../../../types/lib";
import { Strategy } from "../types";

export const doubleEmaStrategy = (
  asset: Asset,
  fastPeriod = 22,
  slowPeriod = 56
): Strategy => {
  const emaFast = ema(asset.closings, { period: fastPeriod });
  const emaSlow = ema(asset.closings, { period: slowPeriod });

  const strategyResult = {
    longStrategy: new Array(asset.closings.length).fill(Action.HOLD),
    shortStrategy: new Array(asset.closings.length).fill(Action.HOLD),
    length: asset.closings.length,
  };

  // S'assurer d'avoir suffisamment de données
  const startIndex = Math.max(fastPeriod, slowPeriod);

  // Variables pour suivre l'état précédent
  let inLongPosition = false;
  let inShortPosition = false;

  for (let i = startIndex; i < asset.closings.length; i++) {
    const isCrossUp = emaFast[i] > emaSlow[i] && emaFast[i - 1] <= emaSlow[i - 1];
    const isCrossDown = emaFast[i] < emaSlow[i] && emaFast[i - 1] >= emaSlow[i - 1];
    const priceDirection = asset.closings[i] > asset.closings[i - 1];

    // Signaux d'achat
    if (isCrossUp && priceDirection && !inLongPosition) {
      strategyResult.longStrategy[i] = Action.BUY;
      strategyResult.shortStrategy[i] = Action.SELL;
      inLongPosition = true;
      inShortPosition = false;
    }
    // Signaux de vente
    else if (isCrossDown && !priceDirection && !inShortPosition) {
      strategyResult.longStrategy[i] = Action.SELL;
      strategyResult.shortStrategy[i] = Action.BUY;
      inLongPosition = false;
      inShortPosition = true;
    }
    // Maintien des positions existantes
    else {
      strategyResult.longStrategy[i] = Action.HOLD;
      strategyResult.shortStrategy[i] = Action.HOLD;
    }
  }

  return strategyResult;
};

export const tripleEmaStrategy = (
  asset: Asset,
  fastPeriod = 9,
  mediumPeriod = 21,
  longPeriod = 50
): Strategy => {
  const emaFast = ema(asset.closings, { period: fastPeriod });
  const emaMedium = ema(asset.closings, { period: mediumPeriod });
  const emaLong = ema(asset.closings, { period: longPeriod });

  const strategyResult = {
    longStrategy: new Array(asset.closings.length).fill(Action.HOLD),
    shortStrategy: new Array(asset.closings.length).fill(Action.HOLD),
    length: asset.closings.length,
  };

  // On s'assure d'avoir suffisamment de données pour commencer
  const startIndex = Math.max(fastPeriod, mediumPeriod, longPeriod);

  for (let i = startIndex; i < asset.closings.length; i++) {
    // Alignement des EMAs pour une tendance haussière
    const bullishAlignment = 
      emaFast[i] > emaMedium[i] && 
      emaMedium[i] > emaLong[i] &&
      emaFast[i] > emaFast[i - 1];  // Confirmation de la direction

    // Alignement des EMAs pour une tendance baissière
    const bearishAlignment = 
      emaFast[i] < emaMedium[i] && 
      emaMedium[i] < emaLong[i] &&
      emaFast[i] < emaFast[i - 1];  // Confirmation de la direction

    // Génération des signaux avec gestion des croisements
    if (bullishAlignment && !bullishAlignment) {
      strategyResult.longStrategy[i] = Action.BUY;
      strategyResult.shortStrategy[i] = Action.SELL;
    } else if (bearishAlignment && !bearishAlignment) {
      strategyResult.longStrategy[i] = Action.SELL;
      strategyResult.shortStrategy[i] = Action.BUY;
    } else {
      strategyResult.longStrategy[i] = Action.HOLD;
      strategyResult.shortStrategy[i] = Action.HOLD;
    }
  }

  return strategyResult;
};

// Modifiez la fonction macdStrategy pour accepter un résultat MACD personnalisé
type MacdResult = {
  macdLine: number[];
  signalLine: number[];
  histogram?: number[];
};

export const macdStrategy = (asset: Asset, customMacd?: MacdResult): Strategy => {
  const macdResult = customMacd || macd(asset.closings);
  const actions = new Array(macdResult.macdLine.length);
  const strategyResult = {
    longStrategy: new Array(macdResult.macdLine.length).fill(Action.HOLD),
    shortStrategy: new Array(macdResult.macdLine.length).fill(Action.HOLD),
    length: macdResult.macdLine.length,
  };

  for (let i = 0; i < actions.length; i++) {
    if (
      macdResult.macdLine[i] > macdResult.signalLine[i] &&
      macdResult.macdLine[i - 1] <= macdResult.signalLine[i - 1]
    ) {
      strategyResult.longStrategy[i] = Action.BUY;
      strategyResult.shortStrategy[i] = Action.SELL;
    } else if (
      macdResult.macdLine[i] < macdResult.signalLine[i] &&
      macdResult.macdLine[i - 1] >= macdResult.signalLine[i - 1]
    ) {
      strategyResult.longStrategy[i] = Action.SELL;
      strategyResult.shortStrategy[i] = Action.BUY;
    } else {
      strategyResult.longStrategy[i] = Action.HOLD;
      strategyResult.shortStrategy[i] = Action.HOLD;
    }
  }

  return strategyResult;
};

export const rsiStrategy = (asset: Asset, customRsi?: number[]): Strategy => {
  const rsiResult = customRsi || rsi(asset.closings, { period: 14 });
  const strategyResult = {
    longStrategy: new Array(rsiResult.length).fill(Action.HOLD),
    shortStrategy: new Array(rsiResult.length).fill(Action.HOLD),
    length: rsiResult.length,
  };

  for (let i = 0; i < strategyResult.longStrategy.length; i++) {
    if (rsiResult[i] < 40) {
      strategyResult.longStrategy[i] = Action.BUY;
      strategyResult.shortStrategy[i] = Action.SELL;
    } else if (rsiResult[i] > 60) {
      strategyResult.longStrategy[i] = Action.SELL;
      strategyResult.shortStrategy[i] = Action.BUY;
    }
  }
  return strategyResult;
}

export const macdRsiStrategy = (asset: Asset, customMacd?: MacdResult, customRsi?: number[]): Strategy => {
  const macdResult = customMacd || macd(asset.closings);
  const rsiResult = customRsi || rsi(asset.closings, { period: 14 });
  const prices = asset.closings;
  
  const strategyResult = {
    longStrategy: new Array(macdResult.macdLine.length).fill(Action.HOLD),
    shortStrategy: new Array(macdResult.macdLine.length).fill(Action.HOLD),
    length: macdResult.macdLine.length,
  };

  const divergenceWindow = 10; // Fenêtre plus large pour éviter les faux signaux

  for (let i = divergenceWindow; i < prices.length; i++) {
    // Vérification des valeurs disponibles
    if (rsiResult[i] === undefined || macdResult.macdLine[i] === undefined) continue;

    // Détection des tendances
    const priceDowntrend = prices[i] < prices[i - divergenceWindow];
    const priceUptrend = prices[i] > prices[i - divergenceWindow];
    const macdDowntrend = macdResult.macdLine[i] < macdResult.macdLine[i - divergenceWindow];
    const macdUptrend = macdResult.macdLine[i] > macdResult.macdLine[i - divergenceWindow];

    // Détection des divergences
    const bullishDivergence = priceDowntrend && macdUptrend && rsiResult[i] < 30;
    const bearishDivergence = priceUptrend && macdDowntrend && rsiResult[i] > 70;

    // Génération des signaux
    if (bullishDivergence) {
      strategyResult.longStrategy[i] = Action.BUY;
      strategyResult.shortStrategy[i] = Action.SELL;
    } else if (bearishDivergence) {
      strategyResult.longStrategy[i] = Action.SELL;
      strategyResult.shortStrategy[i] = Action.BUY;
    } else if (
      macdResult.macdLine[i] > macdResult.signalLine[i] &&
      macdResult.macdLine[i - 1] <= macdResult.signalLine[i - 1] &&
      rsiResult[i] < 30
    ) {
      strategyResult.longStrategy[i] = Action.BUY;
      strategyResult.shortStrategy[i] = Action.SELL;
    } else if (
      macdResult.macdLine[i] < macdResult.signalLine[i] &&
      macdResult.macdLine[i - 1] >= macdResult.signalLine[i - 1] &&
      rsiResult[i] > 70
    ) {
      strategyResult.longStrategy[i] = Action.SELL;
      strategyResult.shortStrategy[i] = Action.BUY;
    }
  }

  return strategyResult;
};


export const envStrategy = (
  asset: Asset,
  period = 20,
  lowLevel = 5,
  highLevel = 5
): Strategy => {
  const emaResult = ema(asset.closings, { period });
  const envSup = emaResult.map((value) => value * (1 + highLevel / 100));
  const envInf = emaResult.map((value) => value * (1 - lowLevel / 100));
  const actions = new Array(emaResult.length);
  const strategyResult = {
    longStrategy: new Array(emaResult.length).fill(Action.HOLD),
    shortStrategy: new Array(emaResult.length).fill(Action.HOLD),
    length: emaResult.length,
  };

  for (let i = 0; i < actions.length; i++) {
    if (asset.closings[i] < envInf[i]) {
      strategyResult.longStrategy[i] = Action.BUY;
      strategyResult.shortStrategy[i] = Action.SELL;
    } else if (asset.closings[i] > envSup[i]) {
      strategyResult.shortStrategy[i] = Action.BUY;
      strategyResult.longStrategy[i] = Action.SELL;
    }
  }

  return strategyResult;
};

export const trailingStopStrategy = (
  asset: Asset,
  trailingPercentage: number = 2
): Strategy => {
  const strategyResult: Strategy = {
    longStrategy: new Array(asset.closings.length).fill(Action.HOLD),
    shortStrategy: new Array(asset.closings.length).fill(Action.HOLD),
    length: asset.closings.length,
  };

  let highestPrice = asset.closings[0];
  let lowestPrice = asset.closings[0];

  for (let i = 1; i < asset.closings.length; i++) {
    const currentPrice = asset.closings[i];

    // Pour les positions longues
    if (currentPrice > highestPrice) {
      highestPrice = currentPrice;
    }

    const longStopPrice = highestPrice * (1 - trailingPercentage / 100);
    if (currentPrice < longStopPrice) {
      strategyResult.longStrategy[i] = Action.SELL;
    } else if (currentPrice > highestPrice) {
      strategyResult.longStrategy[i] = Action.BUY;
    }

    // Pour les positions courtes
    if (currentPrice < lowestPrice) {
      lowestPrice = currentPrice;
    }

    const shortStopPrice = lowestPrice * (1 + trailingPercentage / 100);
    if (currentPrice > shortStopPrice) {
      strategyResult.shortStrategy[i] = Action.SELL;
    } else if (currentPrice < lowestPrice) {
      strategyResult.shortStrategy[i] = Action.BUY;
    }
  }

  return strategyResult;
};
