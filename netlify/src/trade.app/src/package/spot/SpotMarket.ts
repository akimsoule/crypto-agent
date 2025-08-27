import { Market } from "../common/Account";

import { SpotCommon } from "./SpotCommon";
import { Label } from "../common/Label";
import {
  MixHoldSideEnum,
  JSONObject,
  OrderSideEnum,
} from "../common/MapperType";
import { FilterRoi } from "../filter/Filter";
import { SpotOrderRequestV2 } from "bitget-api";

class SpotMarket extends SpotCommon implements Market {
  entry = async (
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ) => {
    let message;
    const qty = 13;
    const usdtQtyAvailable = await this.getSymbolQty("usdt");
    if (usdtQtyAvailable >= qty) {
      const params: JSONObject = {};
      params[Label.SYMBOL] = this.config.botParameter.getSymbolV2(symbol);
      params[Label.SIDE] = OrderSideEnum.BUY;
      params[Label.ORDER_TYPE] = Label.MARKET;
      params[Label.FORCE] = "normal";
      params[Label.SIZE] = qty;
      params[Label.CLIENT_OID] = Label.SIGN + new Date().getTime();
      const paramsType: SpotOrderRequestV2 =
        params as unknown as SpotOrderRequestV2;
      try {
        const data: JSONObject = (await this.config.bitgetClientV2.spotSubmitOrder(paramsType))
          .data;
        message =
          Label.ENTRY +
          mixHoldSideEnum +
          " " +
          "Symbol=" +
          symbol +
          " Price=" +
          currentPrice +
          " data=" +
          JSON.stringify(data);
        console.log(message);
        await this.config.telegramClient.sendMessage(
          this.config.telegramGroupOrderId,
          message
        );
        return true;
      } catch (error) {
        message =
          "Exception while entry for " +
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
    } else {
      message = "Insuffisciant usdt " + usdtQtyAvailable;
      console.log(message);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        message
      );

      return false;
    }
  };

  exit = async (
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ) => {
    let message = "";
    const availableSymbol = await this.getSymbolQty(symbol);
    const params: JSONObject = {};
    try {
      if (availableSymbol > 0) {
        const params: JSONObject = {};
        params[Label.SYMBOL] = this.config.botParameter.getSymbolV2(symbol);
        params[Label.SIDE] = OrderSideEnum.SELL;
        params[Label.ORDER_TYPE] = Label.MARKET;
        params[Label.FORCE] = "normal";
        params[Label.SIZE] = availableSymbol;
        params[Label.CLIENT_OID] = Label.SIGN + new Date().getTime();
        const data: { orderId: string; clientOid: string } = (await this.config.bitgetClientV2.spotSubmitOrder(params as unknown as SpotOrderRequestV2))
          .data;
        message =
          Label.EXIT +
          mixHoldSideEnum +
          " " +
          "Symbol=" +
          symbol +
          " Price=" +
          currentPrice +
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
        "Exception while exit for " +
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
  };

  exitIfPL = async (
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ) => {
    const position = await this.getCurrentPosition(symbol, mixHoldSideEnum);
    const filterRoi = this.group.filter.filters.filters.find(
      (filter) => filter instanceof FilterRoi
    ) as FilterRoi;
    if (filterRoi) {
      return (
        filterRoi.isWinning(position, currentPrice) &&
        (await this.exit(symbol, currentPrice, mixHoldSideEnum))
      );
    }
    return false;
  };
}

export { SpotMarket };
