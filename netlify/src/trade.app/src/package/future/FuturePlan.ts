import { Plan } from "../common/Account";
import {
  MixHoldSideEnum,
  MixQueryPlanEnum,
  MixPlanTypeEnum,
} from "../common/MapperType";
import { FutureLimit } from "./FutureLimit";

class FuturePlan extends FutureLimit implements Plan {
  stopLoss(
    symbol: string,
    triggerPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): void {
    console.log(`Setting stop loss for ${symbol} at ${triggerPrice} with side ${mixHoldSideEnum}`);
    throw new Error("Method not implemented.");
  }
  getCurrentPlan(
    symbol: string,
    mixQueryPlanEnum: MixQueryPlanEnum,
    mixPlanTypeEnum: MixPlanTypeEnum
  ): string {
    console.log(`Getting current plan for ${symbol} with query ${mixQueryPlanEnum} and type ${mixPlanTypeEnum}`);
    throw new Error("Method not implemented.");
  }
  cancelPlan(
    orderId: string,
    symbol: string,
    mixPlanTypeEnum: MixPlanTypeEnum
  ): void {
    console.log(`Cancelling plan ${orderId} for ${symbol} with type ${mixPlanTypeEnum}`);
    throw new Error("Method not implemented.");
  }
  takeProfit(
    symbol: string,
    takeProfit: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): void {
    console.log(`Setting take profit for ${symbol} at ${takeProfit} with side ${mixHoldSideEnum}`);
    throw new Error("Method not implemented.");
  }
  trailingStop(
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum,
    triggerPrice: number,
    rangeRateForTakeProfit: number
  ): void {
    console.log(`Setting trailing stop for ${symbol} at ${triggerPrice} with side ${mixHoldSideEnum} and range ${rangeRateForTakeProfit}`);
    throw new Error("Method not implemented.");
  }
}

export { FuturePlan };
