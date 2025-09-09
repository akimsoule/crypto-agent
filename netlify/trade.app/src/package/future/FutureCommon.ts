import {
  APIResponse,
  FuturesCandlesRequestV2,
  FuturesGetHistoryOrdersRequestV2,
  FuturesHistoricalPositionsRequestV2,
  FuturesHistoryOrderV2,
  FuturesHistoryPositionV2,
  FuturesKlineInterval,
  FuturesPositionV2,
  FuturesProductTypeV2,
  FuturesSetLeverageRequestV2,
  FuturesSetMarginModeRequestV2,
  FuturesSingleAccountRequestV2,
  FuturesTickerV2,
} from "bitget-api";
import { Label } from "../common/Label";
import { Config } from "../common/Config";

import { Util } from "../common/Util";
import {
  Group,
  CandlestickIntervalEnum,
  MixHoldSideEnum,
  MixMarginModeEnum,
  JSONObject,
  Candlestick,
  FutureGroup,
  JSONArray,
} from "../common/MapperType";
import { Common, CommonUtils } from "../common/Account";
import { FilterRoi } from "../filter/Filter";

class FutureCommon extends CommonUtils implements Common {
  config: Config;

  constructor(config: Config) {
    super();
    this.config = config;
  }

  getAllSymbolsInFuture = async (): Promise<
    { symbol: string; currentPrice: number; circulatingSupply: number }[]
  > => {
    const params: JSONObject = {};

    params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
    const paramsType: {
      productType: FuturesProductTypeV2;
    } = params as {
      productType: FuturesProductTypeV2;
    };
    try {
      const response = await this.config.cachedBitgetClient.request(
        "getFuturesAllTickers",
        paramsType
      ) as { data?: FuturesTickerV2[] };
      const symbols = response?.data?.map((ticker: FuturesTickerV2) => ({
        symbol: ticker.symbol
          .toString()
          .replace("USDT", "")
          .replace("SUSDT", ""),
        currentPrice: parseFloat(ticker.lastPr),
        circulatingSupply:
          parseFloat(ticker.baseVolume as string) *
          parseFloat(ticker.lastPr as string),
      }));
      return symbols ?? [];
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while getAllSymbolsInFuture " + JSON.stringify(error)
      );
    }
    return [];
  };

  getHistoricOrders = async (
    limit: number | string,
    symbol: string | undefined
  ): Promise<JSONArray> => {
    const params: JSONObject = {};
    // params[Label.SYMBOL] = this.config.botParameter.getSymbolIfSimV2(symbol);
    params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
    if (symbol) {
      params[Label.SYMBOL] = this.config.botParameter.getSymbolIfSimV2(symbol);
    }
    params[Label.LIMIT] = limit + "";

    const paramsType: FuturesGetHistoryOrdersRequestV2 =
      params as unknown as FuturesGetHistoryOrdersRequestV2;
    try {
      const response = await this.config.cachedBitgetClient.request(
        "getFuturesHistoricOrders",
        paramsType as unknown as Record<string, unknown>
      ) as { data?: { entrustedList?: JSONArray } };
      const order = response?.data?.entrustedList as unknown as JSONArray;

      return order ?? [];
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while getLastOrder " + JSON.stringify(error)
      );
    }
    return [];
  };

  getLastOrder = async (
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<JSONObject> => {
    const params: JSONObject = {};
    params[Label.SYMBOL] = this.config.botParameter.getSymbolIfSimV2(symbol);
    params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
    params[Label.LIMIT] = "1000";
    const paramsType: FuturesGetHistoryOrdersRequestV2 =
      params as unknown as FuturesGetHistoryOrdersRequestV2;

    try {
      const response = await this.config.cachedBitgetClient.request(
        "getFuturesHistoricOrders",
        paramsType as unknown as Record<string, unknown>
      ) as { data?: { entrustedList?: JSONArray } };
      const entrustedList = response?.data?.entrustedList as unknown as FuturesHistoryOrderV2[] | undefined;
      const order = entrustedList?.find(
        (order) =>
          mixHoldSideEnum.toLowerCase() === order.posSide.toLowerCase()
      );

      return (order as unknown as JSONObject) ?? {};
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while getLastOrder " + JSON.stringify(error)
      );
    }
    return {};
  };

  getCurrentPrice = async (symbol: string): Promise<number> => {
    return this.fetchWithCache(`currentPrice_${symbol}`, async () => {
      const params: JSONObject = {};
      params[Label.SYMBOL] = this.config.botParameter.getSymbolV2(symbol);
      params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
      try {
        const params: FuturesCandlesRequestV2 = {
          symbol: this.config.botParameter.getSymbolV2(symbol),
          productType:
            this.config.botParameter.getProductType() as FuturesProductTypeV2,
          granularity: CandlestickIntervalEnum.HOURLY
            .futureIntervalId as FuturesKlineInterval,
          limit: "100",
          endTime: new Date().getTime().toString(),
        };
        const data = (await this.config.bitgetClientV2.getFuturesCandles(params))
          .data as unknown as number[][];

        const newCandlesticks = data.map((array) => {
          const candle: Candlestick = {
            ts: Number(array[0]),
            open: Number(array[1]),
            high: Number(array[2]),
            low: Number(array[3]),
            close: Number(array[4]),
            quoteVol: Number(array[5]),
            baseVol: Number(array[6]),
          };
          return candle;
        });

        newCandlesticks.sort((o1, o2) => o2.ts - o1.ts);
        return newCandlesticks[0].close;
      } catch (error) {
        console.error(error);
        await this.config.telegramClient.sendMessage(
          this.config.telegramGroupOrderId,
          "Exception while getCurrentPrice " + JSON.stringify(error)
        );
      }
    });
  };

  getUsdtAvailable = async (): Promise<number> => {
    const params: JSONObject = {};
    params[Label.SYMBOL] = this.config.botParameter.getSymbolIfSimV2("BTC");
    params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
    params[Label.MARGIN_COIN] = this.config.botParameter.getFutureMarginCoin();
    const paramsType: FuturesSingleAccountRequestV2 =
      params as unknown as FuturesSingleAccountRequestV2;
    try {
      const response = await this.config.bitgetClientV2.getFuturesAccountAsset(
        paramsType
      );
      return response.data.crossedMaxAvailable as unknown as number;
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while getUsdtAvailable " + JSON.stringify(error)
      );
    }
    return 0;
  };

  getQtyToInvest = async (
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<number> => {
    let minCryptoQty;
    let minCryptoQtyInFiveUsdt;
    let minCrypto;
    const copyInfoParams: JSONObject = {};

    const filter = new FilterRoi();
    const pos = await this.getCurrentPosition(symbol, mixHoldSideEnum);
    const roe = Math.abs(filter.getReturnOnEquity(pos, currentPrice));
    const factor = Math.max(1, parseInt((roe / 20).toFixed(0)));

    console.log("factor=", factor);
    await this.config.telegramClient.sendMessage(
      this.config.telegramGroupOrderId,
      "Factor=" + factor + ";\n Roe=" + roe
    );

    try {
      copyInfoParams[Label.SYMBOL] =
        this.config.botParameter.getSymbolIfSimV2(symbol);
      copyInfoParams[Label.PRODUCT_TYPE] =
        this.config.botParameter.getProductType();

      const minOpenCountForTrader = await this.getMinOpenCountForTrader(
        symbol,
        currentPrice
      );

      // Elite Trader only for prod
      if (
        this.config.botParameter.isProdEnv() &&
        !this.config.botParameter.isSimEnv()
      ) {
        const fivePercentOfAmount = await this.getFivePercentOfAmount(
          currentPrice
        );

        if (fivePercentOfAmount > 0) {
          return Math.max(fivePercentOfAmount, minOpenCountForTrader) * factor;
        }
      }

      const amountInCrypto = this.getGroup().amountInCrypto;
      if (
        amountInCrypto &&
        amountInCrypto > Util.convertUsdtToCrypto(5, currentPrice)
      ) {
        return amountInCrypto * factor;
      }

      const cryptoInfo = await this.getContractInfo(symbol);

      if (!cryptoInfo) {
        throw new Error("Contract info not found");
      }

      minCryptoQty = parseFloat(String(cryptoInfo[Label.MIN_TRADE_NUM]));
      minCryptoQtyInFiveUsdt = Util.convertUsdtToCrypto(5, currentPrice);
      minCrypto = Math.max(minCryptoQty, minCryptoQtyInFiveUsdt);

      return minCrypto * 2 * factor;
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while getQtyToInvest " + JSON.stringify(error)
      );
    }

    minCryptoQty = Util.getUnitPip(currentPrice);
    return minCryptoQty * 2 * factor;
  };

  private getContractInfo = async (symbol: string): Promise<JSONObject> => {
    const params = {
      [Label.SYMBOL]: this.config.botParameter.getSymbolIfSimV2(symbol),
      [Label.PRODUCT_TYPE]: this.config.botParameter.getProductType(),
    };

    const response = await this.config.bitgetClientV2.getPrivate(
      "/api/v2/mix/market/contracts",
      params
    );
    return response.data[0] ?? null;
  };

  getFivePercentOfAmount = async (currentPrice: number) => {
    try {
      const account = await this.getUsdtAvailable();
      const fivePercentOfAmountInUsdt = (account * 5) / 100;
      const fivePercentOfAmountInCypto = Util.convertUsdtToCrypto(
        fivePercentOfAmountInUsdt,
        currentPrice
      );
      let minCryptoQtyInFiveUsdt = Util.convertUsdtToCrypto(5, currentPrice);
      minCryptoQtyInFiveUsdt = Util.fix(minCryptoQtyInFiveUsdt, currentPrice);
      if (fivePercentOfAmountInCypto > minCryptoQtyInFiveUsdt) {
        return fivePercentOfAmountInCypto;
      }
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while getFivePercentOfAmount" + JSON.stringify(error)
      );
    }
    return 0;
  };

  getMinOpenCountForTrader = async (symbol: string, currentPrice: number) => {
    //only for trader who make copies of the trade
    const copySettingParams: JSONObject = {};
    copySettingParams[Label.PRODUCT_TYPE] =
      this.config.botParameter.getProductType();
    try {
      const copyResponse = await this.config.bitgetClientV2.getPrivate(
        "/api/v2/copy/mix-trader/config-query-symbols",
        copySettingParams
      );
      const copyInfo = copyResponse.data?.find(
        (item: JSONObject) =>
          item.symbol === this.config.botParameter.getSymbolIfSimV2(symbol)
      );

      if (copyInfo && Label.MIN_OPEN_COUNT in copyInfo) {
        const minOpenCount = parseFloat(copyInfo[Label.MIN_OPEN_COUNT]);
        const fiveInCrypto = Util.convertUsdtToCrypto(5, currentPrice);
        if (minOpenCount > fiveInCrypto) {
          return minOpenCount;
        }
      }
    } catch {
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Only for trader who make copy trade "
      );
    }
    return 0;
  };

  getCurrentLeverage = async (
    group: Group,
    pos: JSONObject
  ): Promise<number> => {
    let leverage: number = 5;
    const oldLeverage = this.getLeverage(pos);
    const setLeverage = (group as FutureGroup).margeLeverage;

    if (oldLeverage !== -1 && setLeverage >= oldLeverage) {
      leverage = setLeverage;
    }
    return leverage;
  };

  getLeverage = (position: JSONObject): number => {
    let leverage: number = -1;
    if (position) {
      if (Label.OPEN_LEVERAGE in position) {
        leverage = position[Label.OPEN_LEVERAGE] as number;
      } else if (Label.LEVERAGE in position) {
        leverage = position[Label.LEVERAGE] as number;
      }
    }
    return leverage;
  };

  private setLeverage = async (
    group: Group,
    symbol: string,
    pos: JSONObject,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<void> => {
    const params: JSONObject = {};
    const currentLeverage = await this.getCurrentLeverage(group, pos);
    const leverage: number =
      currentLeverage !== -1
        ? currentLeverage
        : (group as FutureGroup).margeLeverage;
    params[Label.SYMBOL] = this.config.botParameter.getSymbolIfSimV2(symbol);
    params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
    params[Label.MARGIN_COIN] = this.config.botParameter.getFutureMarginCoin();
    params[Label.LEVERAGE] = leverage;
    params[Label.HOLD_SIDE] = mixHoldSideEnum;
    const paramsType: FuturesSetLeverageRequestV2 =
      params as unknown as FuturesSetLeverageRequestV2;
    try {
      this.setGroup(group);
      await this.config.bitgetClientV2.setFuturesLeverage(paramsType);
      console.log(
        "leverage=",
        leverage,
        "for symbol=",
        symbol,
        "mixHoldSideEnum=",
        mixHoldSideEnum
      );
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while setLeverage " + JSON.stringify(error)
      );
    }
  };

  public async setLeverageWithCache(
    group: Group,
    symbol: string,
    pos: JSONObject,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<void> {
    const key = `leverage_${symbol}_${mixHoldSideEnum}`;
    if (this.cache[key]) {
      console.log(
        `Leverage for ${symbol} is already cached: ${this.cache[key]}`
      );
      return;
    }

    await this.setLeverage(group, symbol, pos, mixHoldSideEnum);
    const currentLeverage = await this.getCurrentLeverage(group, pos);
    this.cache[key] = currentLeverage;
  }

  public async setLeverageWithLeverage(
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum,
    leverage: number
  ): Promise<void> {
    const params: JSONObject = {
      [Label.SYMBOL]: this.config.botParameter.getSymbolIfSimV2(symbol),
      [Label.PRODUCT_TYPE]: this.config.botParameter.getProductType(),
      [Label.MARGIN_COIN]: this.config.botParameter.getFutureMarginCoin(),
      [Label.LEVERAGE]: leverage,
      [Label.HOLD_SIDE]: mixHoldSideEnum,
    };

    const paramsType: FuturesSetLeverageRequestV2 =
      params as unknown as FuturesSetLeverageRequestV2;

    try {
      await this.config.bitgetClientV2.setFuturesLeverage(paramsType);
      console.log(
        "leverage=",
        leverage,
        "for symbol=",
        symbol,
        "mixHoldSideEnum=",
        mixHoldSideEnum
      );

      // Mise à jour du cache
      const key = `leverage_${symbol}_${mixHoldSideEnum}`;
      this.cache[key] = leverage;
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while setLeverageWithLeverage " + JSON.stringify(error)
      );
    }
  }

  private setMarginMode = async (
    group: Group,
    symbol: string,
    posArray: JSONObject[]
  ): Promise<void> => {
    let found: boolean = false;
    let currentMarginMode: MixMarginModeEnum = MixMarginModeEnum.CROSSED;
    for (const pos of posArray) {
      if (pos !== null && Label.MARGIN_MODE in pos) {
        found = true;
        currentMarginMode = pos[
          Label.MARGIN_MODE
        ] as string as MixMarginModeEnum;
        break;
      }
    }
    if (found === false) {
      currentMarginMode = (group as FutureGroup).marginMode;
    }
    const params: JSONObject = {};
    params[Label.SYMBOL] = this.config.botParameter.getSymbolIfSimV2(symbol);
    params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
    params[Label.MARGIN_COIN] = this.config.botParameter.getFutureMarginCoin();
    params[Label.MARGIN_MODE] = currentMarginMode;
    const paramsType: FuturesSetMarginModeRequestV2 =
      params as unknown as FuturesSetMarginModeRequestV2;
    try {
      await this.config.bitgetClientV2.setFuturesMarginMode(paramsType);
      console.log("marginMode=", currentMarginMode, "for symbol=", symbol);
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while setMarginMode " + JSON.stringify(error)
      );
    }
  };

  public async setMarginModeWithCache(
    group: Group,
    symbol: string,
    posArray: JSONObject[]
  ): Promise<void> {
    const key = `marginMode_${symbol}`;
    if (this.cache[key]) {
      console.log(
        `Margin mode for ${symbol} is already cached: ${this.cache[key]}`
      );
      return;
    }

    await this.setMarginMode(group, symbol, posArray);
    const currentMarginMode =
      posArray.length > 0 ? posArray[0][Label.MARGIN_MODE] : null;
    this.cache[key] = currentMarginMode;
  }

  getAllCopyPositions = async (
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<JSONObject[]> => {
    let positions: JSONArray = [];
    try {
      const params: JSONObject = {};
      params[Label.SYMBOL] = this.config.botParameter.getSymbolV2(symbol);
      params[Label.PRODUCT_TYPE] = "usdt-futures";
      const response = (await this.config.bitgetClientV2.getPrivate(
        "/api/v2/copy/mix-trader/order-current-track",
        params
      )) as APIResponse<JSONObject>;
      const data = response.data;
      if (Label.TRACKING_LIST in data) {
        positions = data[Label.TRACKING_LIST] as JSONArray;
        if (!positions || positions.length === 0) {
          return [] as JSONArray;
        }
        positions = positions.filter(
          (position: JSONObject) => position[Label.POS_SIDE] === mixHoldSideEnum
        ) as JSONArray;
        return positions;
      }
    } catch (error) {
      console.error(JSON.stringify(error));
      if (
        this.config.botParameter.isProdEnv() &&
        !this.config.botParameter.isSimEnv()
      ) {
        await this.config.telegramClient.sendMessage(
          this.config.telegramGroupOrderId,
          "Exception while getAllCopyPositions " + error
        );
      }
    }
    return positions;
  };

  getCurrentPosition = async (
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<JSONObject> => {
    return this.fetchWithCache(
      `currentPosition_${symbol}_${mixHoldSideEnum}`,
      async () => {
        let data: JSONObject = {};
        const params: JSONObject = {};
        params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
        params[Label.SYMBOL] =
          this.config.botParameter.getSymbolIfSimV2(symbol);
        params[Label.MARGIN_COIN] =
          this.config.botParameter.getFutureMarginCoin();
        const paramsType: FuturesSingleAccountRequestV2 =
          params as unknown as FuturesSingleAccountRequestV2;
        try {
          const response = await this.config.bitgetClientV2.getFuturesPosition(
            paramsType
          );
          const result = response.data.find(
            (pos: FuturesPositionV2) => mixHoldSideEnum === pos.holdSide
          ) as unknown as JSONObject;
          if (result) {
            data = result;
          }
          return data;
        } catch (error) {
          console.error(JSON.stringify(error));
          await this.config.telegramClient.sendMessage(
            this.config.telegramGroupOrderId,
            "Exception while getCurrentPosition " + JSON.stringify(error)
          );
        }
        return data;
      }
    );
  };

  getAllPositions = async (): Promise<JSONArray> => {
    let data: JSONArray = [];
    const params: JSONObject = {};
    params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
    params[Label.MARGIN_COIN] = this.config.botParameter.getFutureMarginCoin();
    const paramsType: {
      productType: FuturesProductTypeV2;
      marginCoin?: string;
    } = params as unknown as {
      productType: FuturesProductTypeV2;
      marginCoin?: string;
    };
    try {
      const response = await this.config.bitgetClientV2.getFuturesPositions(
        paramsType
      );
      const result = response.data as unknown as JSONArray;
      if (result) {
        data = result;
      }
      return data;
    } catch (error) {
      console.error(JSON.stringify(error));
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while getCurrentPosition " + JSON.stringify(error)
      );
    }
    return data;
  };

  getHistoryPositions = async (symbol: string): Promise<JSONArray> => {
    const params: JSONObject = {};
    params[Label.SYMBOL] = this.config.botParameter.getSymbolIfSimV2(symbol);
    params[Label.LIMIT] = 100;
    try {
      const historyPositions =
        await this.config.bitgetClientV2.getFuturesHistoricPositions(params);
      return historyPositions.data.list.map(
        (position: FuturesHistoryPositionV2) => ({ ...position })
      );
    } catch (error) {
      console.error(JSON.stringify(error));
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while getHistoryPositions " + JSON.stringify(error)
      );
    }
    return [];
  };

  getLimitHistoryPositions = async (
    limit: string = "100",
    symbol: string | undefined
  ): Promise<JSONArray> => {
    const params: JSONObject = {};
    params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
    params[Label.LIMIT] = limit;
    if (symbol) {
      params[Label.SYMBOL] = this.config.botParameter.getSymbolIfSimV2(symbol);
    }

    const paramsType: FuturesHistoricalPositionsRequestV2 =
      params as unknown as FuturesHistoricalPositionsRequestV2;

    try {
      const historyPositions =
        await this.config.bitgetClientV2.getFuturesHistoricPositions(
          paramsType
        );
      return historyPositions.data.list.map(
        (position: FuturesHistoryPositionV2) => ({ ...position })
      ) as JSONArray;
    } catch (error) {
      console.error(JSON.stringify(error));
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while getHistoryPositions " + JSON.stringify(error)
      );
    }
    return [];
  };

  getSizeFromPosition = async (
    symbol: string,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<number> => {
    const position = await this.getCurrentPosition(symbol, mixHoldSideEnum);
    return position.available as number;
  };

  setGroup = (group: Group) => {
    this.group = group;
  };

  getGroup = () => {
    return this.group;
  };

  getConfig = (): Config => {
    return this.config;
  };
}

export { FutureCommon };
