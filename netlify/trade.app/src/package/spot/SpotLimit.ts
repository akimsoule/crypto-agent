import { SpotOrderRequestV2 } from "bitget-api";
import { Limit } from "../common/Account";
import { Label } from "../common/Label";
import {
  JSONObject,
  MixHoldSideEnum,
  OrderSideEnum,
} from "../common/MapperType";
import { SpotMarket } from "./SpotMarket";

class SpotLimit extends SpotMarket implements Limit {
  takeLimit(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    orderSideEnum: OrderSideEnum
  ): Promise<boolean> {
    console.log("Take limit", { symbol, currentPrice, mixHoldSideEnum, orderSideEnum });
    throw new Error("Method not implemented.");
  }
  async cancelLimit(
    symbol: string,
    triggerPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _orderSideEnum: OrderSideEnum
  ): Promise<boolean> {
    let message = "";
    const available = await this.getSymbolQty(symbol);
    const params: JSONObject = {};
    try {
      if (available > 0) {
        params[Label.SYMBOL] =
          this.config.botParameter.getSymbolIfSimV2(symbol);
        params[Label.TRIGGER_PRICE] = triggerPrice;
        params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
        params[Label.SIZE] = available;
        switch (mixHoldSideEnum) {
          case MixHoldSideEnum.LONG:
            params[Label.SIDE] = OrderSideEnum.BUY;
            break;
          case MixHoldSideEnum.SHORT:
            params[Label.SIDE] = OrderSideEnum.SELL;
            break;
          default:
            break;
        }
        params[Label.ORDER_TYPE] = Label.LIMIT;
        params[Label.CLIENT_OID] = Label.SIGN + new Date().getTime();
        const paramType = params as unknown as SpotOrderRequestV2;
        let data: { orderId: string; clientOid: string } = {
          orderId: "",
          clientOid: "",
        };
        data = (await this.config.bitgetClientV2.spotSubmitOrder(paramType))
          .data as { orderId: string; clientOid: string };
        message =
          Label.EXIT +
          mixHoldSideEnum +
          " " +
          "Symbol=" +
          symbol +
          " Price=" +
          triggerPrice +
          " data=" +
          JSON.stringify(data);
        console.log(message);

        await this.config.telegramClient.sendMessage(
          this.config.telegramGroupOrderId,
          message
        );
      }
      return true;
    } catch (error) {
      message =
        "Exception while exit limit for " +
        "symbol=" +
        symbol +
        " " +
        "data=" +
        JSON.stringify(params) +
        " " +
        "error=" +
        JSON.stringify(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        message
      );
    }
    return false;
  }
}

export { SpotLimit };
