import { Limit } from "../common/Account";
import { MixHoldSideEnum, OrderSideEnum } from "../common/MapperType";
import { FutureMarket } from "./FutureMarket";

class FutureLimit extends FutureMarket implements Limit {
  takeLimit(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    orderSideEnum: OrderSideEnum
  ): Promise<boolean> {
    console.log(`Taking limit order for ${symbol} at ${currentPrice} with side ${mixHoldSideEnum} and order type ${orderSideEnum}`);
    throw new Error("Method not implemented.");
  }
  cancelLimit(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    orderSideEnum: OrderSideEnum
  ): Promise<boolean> {
    console.log(`Cancelling limit order for ${symbol} at ${currentPrice} with side ${mixHoldSideEnum} and order type ${orderSideEnum}`);
    throw new Error("Method not implemented.");
  }
}

export { FutureLimit };
