import { Asset } from "../../../types/lib";
import { MixHoldSideEnum } from "../../common/MapperType";
import { BacktestMetric } from "./BacktestMetric";

export class BackTest {
  public map: Map<string, BacktestMetric> = new Map();

  public generateName(
    symbol: string,
    type: string,
    mixHoldSideEnum: MixHoldSideEnum
  ): string {
    return `${symbol}_${type}_${mixHoldSideEnum}`
      .replace(" ", "_")
      .toUpperCase();
  }

  public createNewMetricByName(
    asset: Asset,
    name: string,
    mixHoldSideEnum: MixHoldSideEnum
  ): void {
    this.map.set(name, new BacktestMetric(asset, name, mixHoldSideEnum));
  }

  public getBacktestMetric(
    asset: Asset,
    name: string,
    mixHoldSideEnum: MixHoldSideEnum
  ): BacktestMetric {
    if (!this.map.has(name)) {
      this.createNewMetricByName(asset, name, mixHoldSideEnum);
    }
    return this.map.get(name) as BacktestMetric;
  }

  public updateBacktestMetricByName(
    name: string,
    backtestMetric: BacktestMetric
  ): void {
    this.map.set(name, backtestMetric);
  }

  /**
   * Retourne une chaîne représentant toutes les métriques de backtest.
   */
  public toString(): string {
    if (this.map.size === 0) return "Aucune métrique enregistrée.";

    return Array.from(this.map.entries())
      .map(
        ([name, metric]) =>
          `Nom: ${name}\n- Total Trades: ${
            metric.closeTrades
          }\n- Winning Trades: ${metric.winningTrades}\n- Losing Trades: ${
            metric.losingTrades
          }\n- Profit/Loss: ${metric.profitLoss}\n- Max Drawdown: ${
            metric.maxDrawdown
          }\n- Peak: ${
            metric.peak
          }\n- Success Rate: ${metric.successRate.toFixed(
            2
          )}%\n- Max Position Size: ${
            metric.maxPositionSize
          }\n- Position: ${JSON.stringify(
            metric.position
          )}\n- Strategy Performance: ${metric.strategyPerformance}\n`
      )
      .join("\n");
  }
}

export const backTest = new BackTest();
