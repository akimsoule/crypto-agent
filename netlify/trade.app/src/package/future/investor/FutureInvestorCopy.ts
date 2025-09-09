/* eslint-disable @typescript-eslint/no-unused-vars */
import { Copy, Limit, Plan } from "../../common/Account";
import {
  MixHoldSideEnum,
  MixQueryPlanEnum,
  MixPlanTypeEnum,
  OrderSideEnum,
  JSONObject,
} from "../../common/MapperType";

export class FutureInvestorCopy implements Limit, Plan, Copy {
  takeLimit(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    orderSideEnum: OrderSideEnum
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  cancelLimit(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    orderSideEnum: OrderSideEnum
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  stopLoss(
    symbol: string,
    triggerPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): void {
    throw new Error("Method not implemented.");
  }
  getCurrentPlan(
    symbol: string,
    mixQueryPlanEnum: MixQueryPlanEnum,
    mixPlanTypeEnum: MixPlanTypeEnum
  ): string {
    throw new Error("Method not implemented.");
  }
  cancelPlan(
    orderId: string,
    symbol: string,
    mixPlanTypeEnum: MixPlanTypeEnum
  ): void {
    throw new Error("Method not implemented.");
  }
  takeProfit(
    symbol: string,
    takeProfit: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): void {
    throw new Error("Method not implemented.");
  }
  trailingStop(
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum,
    triggerPrice: number,
    rangeRateForTakeProfit: number
  ): void {
    throw new Error("Method not implemented.");
  }
  exitAllCopyIfPL(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  exitAllCopy(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  exitCopy(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    posObj: JSONObject
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}
