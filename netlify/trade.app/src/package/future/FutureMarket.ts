import { Market } from "../common/Account";
import { FutureCommon } from "./FutureCommon";
import { Util } from "../common/Util";
import { Label } from "../common/Label";
import {
  MixHoldSideEnum,
  JSONObject,
  OrderSideEnum,
  TradeSideEnum,
  FutureGroup,
} from "../common/MapperType";
import { Filter, FilterRoi } from "../filter/Filter";
import { FuturesPlaceOrderRequestV2 } from "bitget-api";
import { FacebookService } from "../social/Facebook";

class FutureMarket extends FutureCommon implements Market {
  entry = async (
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ) => {
    let message = "";
    const pos = await this.getCurrentPosition(symbol, mixHoldSideEnum);
    await this.sendRoeBeforeTrade(symbol, mixHoldSideEnum, currentPrice);
    const leverage = await this.getCurrentLeverage(this.getGroup(), pos);
    const ustQtyAvailable = await this.getUsdtAvailable();
    const qtyToInvest = await this.getQtyToInvest(
      symbol,
      currentPrice,
      mixHoldSideEnum
    );
    const marge = Util.convertCryptoToUsdt(qtyToInvest, currentPrice) / leverage;
    if (ustQtyAvailable > marge) {
      const params: JSONObject = {};
      params[Label.SYMBOL] = this.config.botParameter.getSymbolIfSimV2(symbol);
      params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
      params[Label.MARGIN_MODE] = (this.getGroup() as FutureGroup).marginMode;
      params[Label.MARGIN_COIN] =
        this.config.botParameter.getFutureMarginCoin();
      params[Label.SIZE] = qtyToInvest;
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
      params[Label.TRADE_SIDE] = TradeSideEnum.OPEN;
      params[Label.ORDER_TYPE] = Label.MARKET;
      params[Label.CLIENT_OID] = Label.SIGN + new Date().getTime();

      const paramType: FuturesPlaceOrderRequestV2 =
        params as unknown as FuturesPlaceOrderRequestV2;
      try {
        const data: JSONObject = (await this.config.bitgetClientV2.futuresSubmitOrder(paramType))
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
      message =
        "Insuffisciant usdt " +
        ustQtyAvailable +
        ", Need to buy marge=" +
        marge;
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
    let available = await this.getSizeFromPosition(symbol, mixHoldSideEnum);
    const params: JSONObject = {};
    await this.sendRoeBeforeTrade(symbol, mixHoldSideEnum, currentPrice);
    try {
      while (available > 0) {
        params[Label.SYMBOL] =
          this.config.botParameter.getSymbolIfSimV2(symbol);
        params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
        params[Label.MARGIN_MODE] = (this.getGroup() as FutureGroup).marginMode;
        params[Label.MARGIN_COIN] =
          this.config.botParameter.getFutureMarginCoin();
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
        params[Label.TRADE_SIDE] = TradeSideEnum.CLOSE;
        params[Label.ORDER_TYPE] = Label.MARKET;
        params[Label.CLIENT_OID] = Label.SIGN + new Date().getTime();
        const paramsType: FuturesPlaceOrderRequestV2 =
          params as unknown as FuturesPlaceOrderRequestV2;
        await this.config.bitgetClientV2.futuresSubmitOrder(paramsType);
        const position = await this.getCurrentPosition(symbol, mixHoldSideEnum);
        const message = await this.formatClosePositionMessage(
          symbol,
          currentPrice,
          mixHoldSideEnum,
          position,
          available
        );
        const facebookService = new FacebookService();
        await facebookService.loadAccessToken();
        await facebookService.postOnPage(message);
        console.log(message);
        await this.getSizeFromPosition(symbol, mixHoldSideEnum);
        await this.config.telegramClient.sendMessage(
          this.config.telegramGroupOrderId,
          message
        );
        available = await this.getSizeFromPosition(symbol, mixHoldSideEnum);
      }
      return true;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "body" in error &&
        typeof (error as any).body === "object" &&
        (error as any).body !== null &&
        "code" in (error as any).body
      ) {
        if (["40757", "22002"].includes((error as any).body?.code)) {
          return true;
        }
      }
      const message =
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
    if (filterRoi && filterRoi.isWinning(position, currentPrice)) {
      return await this.exit(symbol, currentPrice, mixHoldSideEnum);
    }
    return false;
  };

  private async sendRoeBeforeTrade(
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum,
    currentPrice: number
  ) {
    try {
      const filters: Filter[] = [];
      Util.findAllFilters(this.group.filter.filters.filters, filters);
      const filterRoi = filters.find(
        (filter) => filter instanceof FilterRoi
      ) as FilterRoi;
      if (filterRoi != null) {
        const pos = await this.getCurrentPosition(symbol, mixHoldSideEnum);
        const roe = filterRoi.getReturnOnEquity(pos, currentPrice);
        await this.config.telegramClient.sendMessage(
          this.config.telegramGroupOrderId,
          `Roe for ${mixHoldSideEnum} = ${roe}`
        );
      }
    } catch {
      const message = "Error while sendRoeBeforeTrade";
      console.log(message);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        message
      );
    }
  }

  private getEntryPrice(pos: JSONObject): number {
    if (Label.AVERAGE_OPEN_PRICE in pos) {
      return Number(pos[Label.AVERAGE_OPEN_PRICE]);
    }
    if (Label.OPEN_PRICE_AVG in pos) {
      return Number(pos[Label.OPEN_PRICE_AVG]);
    }
    return 0;
  }

  private formatClosePositionMessage = async (
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    position: JSONObject,
    qtyToInvest: number
  ): Promise<string> => {
    const filter = new FilterRoi();
    const roe = filter.getReturnOnEquity(position, currentPrice);
    const leverage = await this.getCurrentLeverage(this.getGroup(), position);
    const entryPrice = this.getEntryPrice(position);
    const marge =
      Util.convertCryptoToUsdt(qtyToInvest, currentPrice) / leverage;
    const roePourcentage = roe.toFixed(2);
    const emoji = roe >= 0 ? "🟢" : "🔴";
    const profitLoss = ((roe * marge) / 100).toFixed(2);

    return `${emoji} CLÔTURE ${mixHoldSideEnum}
━━━━━━━━━━━━━━━━━━
💱 Paire: ${symbol}/USDT
📥 Prix d'entrée: ${entryPrice.toFixed(2)}
📤 Prix de sortie: ${currentPrice.toFixed(2)} USDT
💰 Marge: ${marge.toFixed(2)} USDT
🎚️ Levier: ${leverage}x
📈 ROE: ${roePourcentage}%
💵 P&L: ${profitLoss} USDT
━━━━━━━━━━━━━━━━━━
⚡️ ${new Date().toLocaleString("fr-FR")}`;
  };
}

export { FutureMarket };
