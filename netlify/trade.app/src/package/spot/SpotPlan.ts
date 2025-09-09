import { Plan } from "../common/Account";
import {
  MixHoldSideEnum,
  MixQueryPlanEnum,
  MixPlanTypeEnum,
} from "../common/MapperType";
import { SpotLimit } from "./SpotLimit";

class SpotPlan extends SpotLimit implements Plan {
  stopLoss(
    symbol: string,
    triggerPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): void {
    console.log("Stop loss", { symbol, triggerPrice, mixHoldSideEnum });
    throw new Error("Method not implemented.");
  }
  getCurrentPlan(
    symbol: string,
    mixQueryPlanEnum: MixQueryPlanEnum,
    mixPlanTypeEnum: MixPlanTypeEnum
  ): string {
    console.log("Get current plan", { symbol, mixQueryPlanEnum, mixPlanTypeEnum });
    throw new Error("Method not implemented.");
  }
  cancelPlan(
    orderId: string,
    symbol: string,
    mixPlanTypeEnum: MixPlanTypeEnum
  ): void {
    console.log("Cancel plan", { orderId, symbol, mixPlanTypeEnum });
    throw new Error("Method not implemented.");
  }
  takeProfit(
    symbol: string,
    takeProfit: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): void {
    console.log("Take profit", { symbol, takeProfit, mixHoldSideEnum });
    throw new Error("Method not implemented.");
  }
  trailingStop(
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum,
    triggerPrice: number,
    rangeRateForTakeProfit: number
  ): void {
    console.log("Trailing stop", { symbol, mixHoldSideEnum, triggerPrice, rangeRateForTakeProfit });
    throw new Error("Method not implemented.");
  }
}

export { SpotPlan };
