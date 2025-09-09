import { Copy } from "../common/Account";
import { Label } from "../common/Label";
import {
  MixHoldSideEnum,
  JSONObject,
  JSONValue,
  JSONArray,
} from "../common/MapperType";
import { Util } from "../common/Util";
import { Filter, FilterRoi } from "../filter/Filter";
import { FuturePlan } from "./FuturePlan";

class FutureCopy extends FuturePlan implements Copy {
  exitAllCopy = async (
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ) => {
    const positions = (await this.getAllCopyPositions(
      symbol,
      mixHoldSideEnum
    )) as Array<JSONValue>;

    for (const element of positions) {
      const position = element as JSONObject;
      this.exitCopy(symbol, currentPrice, mixHoldSideEnum, position);
    }
    return true;
  };

  exitAllCopyIfPL = async (
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ) => {
    const positions = (await this.getAllCopyPositions(
      symbol,
      mixHoldSideEnum
    )) as Array<JSONValue>;

    for (const element of positions) {
      const position = element as JSONObject;
      const filters: Filter[] = [];
      Util.findAllFilters(this.group.filter.filters.filters, filters);
      const filterRoi = filters.find(
        (filter) => filter instanceof FilterRoi
      ) as FilterRoi;
      if (filterRoi) {
        const roe = filterRoi.getReturnOnEquity(position, currentPrice);
        if (roe > 5) {
          this.exitCopy(symbol, currentPrice, mixHoldSideEnum, position);
        }
      }
    }

    return true;
  };

  exitCopy = async (
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    position: JSONObject
  ) => {
    const trackingNo: string = position[Label.TRACKING_NO] as string;
    const params: JSONObject = {};
    params[Label.TRACKING_NO] = trackingNo;
    params[Label.PRODUCT_TYPE] = Label.USDT_FUTURES;
    try {
      const response = (await this.config.bitgetClientV2.postPrivate(
        "/api/v2/copy/mix-trader/order-close-positions",
        params
      )) as JSONObject;
      const data = response.data as JSONArray;
      const message =
        Label.EXIT +
        mixHoldSideEnum +
        " for copy trade" +
        " symbol=" +
        symbol +
        " price=" +
        currentPrice +
        " data=" +
        JSON.stringify(data);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        message
      );
      return true;
    } catch (error) {
      const message =
        "Exception while exit for " +
        " symbol=" +
        symbol +
        " price=" +
        currentPrice +
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
}

export { FutureCopy };
