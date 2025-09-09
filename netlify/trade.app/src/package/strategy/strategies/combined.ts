import { Action, Asset } from "../../../types/lib";
import { Strategy } from "../types";

export const andStrategy = (asset: Asset, strategies: Strategy[]): Strategy => {
  const length = asset.closings.length;

  const strategyResult: Strategy = {
    longStrategy: new Array(length).fill(Action.HOLD),
    shortStrategy: new Array(length).fill(Action.HOLD),
    length,
  };

  for (let i = 0; i < length; i++) {
    const longBuy = strategies.every((s) => s.longStrategy[i] === Action.BUY);
    const longSell = strategies.every((s) => s.longStrategy[i] === Action.SELL);
    const shortBuy = strategies.every((s) => s.shortStrategy[i] === Action.BUY);
    const shortSell = strategies.every(
      (s) => s.shortStrategy[i] === Action.SELL
    );

    if (longBuy) {
      strategyResult.longStrategy[i] = Action.BUY;
    } else if (longSell) {
      strategyResult.longStrategy[i] = Action.SELL;
    } else {
      strategyResult.longStrategy[i] = Action.HOLD;
    }

    if (shortBuy) {
      strategyResult.shortStrategy[i] = Action.BUY;
    } else if (shortSell) {
      strategyResult.shortStrategy[i] = Action.SELL;
    } else {
      strategyResult.shortStrategy[i] = Action.HOLD;
    }
  }

  return strategyResult;
};

export const orStrategy = (asset: Asset, strategies: Strategy[]): Strategy => {
  const length = asset.closings.length;

  const strategyResult: Strategy = {
    longStrategy: new Array(length).fill(Action.HOLD),
    shortStrategy: new Array(length).fill(Action.HOLD),
    length,
  };

  for (let i = 0; i < length; i++) {
    const longBuy = strategies.some((s) => s.longStrategy[i] === Action.BUY);
    const longSell = strategies.some((s) => s.longStrategy[i] === Action.SELL);
    const shortBuy = strategies.some((s) => s.shortStrategy[i] === Action.BUY);
    const shortSell = strategies.some(
      (s) => s.shortStrategy[i] === Action.SELL
    );

    if (longBuy) {
      strategyResult.longStrategy[i] = Action.BUY;
    } else if (longSell) {
      strategyResult.longStrategy[i] = Action.SELL;
    } else {
      strategyResult.longStrategy[i] = Action.HOLD;
    }

    if (shortBuy) {
      strategyResult.shortStrategy[i] = Action.BUY;
    } else if (shortSell) {
      strategyResult.shortStrategy[i] = Action.SELL;
    } else {
      strategyResult.shortStrategy[i] = Action.HOLD;
    }
  }

  return strategyResult;
};

export const andEntryExitStrategy = (
  asset: Asset,
  strategyEntry: Strategy,
  strategyExit: Strategy
): Strategy => {
  const length = asset.closings.length;

  const strategyResult: Strategy = {
    longStrategy: new Array(length).fill(Action.HOLD),
    shortStrategy: new Array(length).fill(Action.HOLD),
    length,
  };

  for (let i = 0; i < length; i++) {
    const longBuy = strategyEntry.longStrategy[i] === Action.BUY;
    const longSell = strategyExit.longStrategy[i] === Action.SELL;
    const shortBuy = strategyEntry.shortStrategy[i] === Action.BUY;
    const shortSell = strategyExit.shortStrategy[i] === Action.SELL;

    if (longBuy) {
      strategyResult.longStrategy[i] = Action.BUY;
    } else if (longSell) {
      strategyResult.longStrategy[i] = Action.SELL;
    } else {
      strategyResult.longStrategy[i] = Action.HOLD;
    }

    if (shortBuy) {
      strategyResult.shortStrategy[i] = Action.BUY;
    } else if (shortSell) {
      strategyResult.shortStrategy[i] = Action.SELL;
    } else {
      strategyResult.shortStrategy[i] = Action.HOLD;
    }
  }

  return strategyResult;
};
