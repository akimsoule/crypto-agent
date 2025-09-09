import {
  GetSpotHistoryOrdersRequestV2,
  SpotAccountAssetV2,
  SpotCandlesRequestV2,
  SpotHistoricTradesRequestV2,
  SpotKlineInterval,
} from "bitget-api";
import { Common, CommonUtils } from "../common/Account";
import { Config } from "../common/Config";
import { Label } from "../common/Label";
import {
  Candlestick,
  CandlestickIntervalEnum,
  Group,
  JSONArray,
  JSONObject,
  MixHoldSideEnum,
  OrderSideEnum,
} from "../common/MapperType";

class SpotCommon extends CommonUtils implements Common {
  config: Config;

  constructor(config: Config) {
    super();
    this.config = config;
  }

  async getUsdtAvailable(): Promise<number> {
    return await this.getSymbolQty("USDT");
  }

  async getHistoricOrders(
    limit: string = "100",
    symbol: string | undefined
  ): Promise<JSONArray> {
    const params: JSONObject = {};
    if (symbol) {
      params[Label.SYMBOL] = this.config.botParameter.getSymbolV2(symbol);
    }
    params[Label.LIMIT] = limit;

    try {
      const response = await this.config.bitgetClientV2.getSpotHistoricOrders(
        params
      );
      const orders = response?.data as unknown as JSONArray;

      if (!(orders instanceof Array) || orders.length === 0) {
        return [];
      }

      // Traitement des ordres
      for (const order of orders) {
        if (
          Label.FEE_DETAIL in order &&
          (order[Label.FEE_DETAIL] as string).length > 0
        ) {
          // Extraction des données de base
          // const size = parseFloat((order.size as string) || "0");
          const priceAvg = parseFloat((order.priceAvg as string) || "0");
          const baseVolume = parseFloat((order.baseVolume as string) || "0");
          const quoteVolume = parseFloat((order.quoteVolume as string) || "0");

          // Parsing des frais
          const feeDetail = JSON.parse(order[Label.FEE_DETAIL] as string);
          // const newFees = feeDetail.newFees;
          const coinFees = feeDetail[order.baseCoin as string];

          // Calcul des frais en USDT
          let feeInUsdt = 0;
          if (coinFees && coinFees.feeCoinCode) {
            const feeAmount = Math.abs(parseFloat(coinFees.totalFee || "0"));
            if (coinFees.feeCoinCode === "USDT") {
              feeInUsdt = feeAmount;
            } else {
              const feeCoinPrice = await this.getCurrentPrice(
                `${coinFees.feeCoinCode}`
              );
              feeInUsdt = feeAmount * feeCoinPrice;
            }
          }

          // Calcul des profits
          let totalProfit = 0;
          if ((order.side as string).toLowerCase() === OrderSideEnum.BUY) {
            const currentPrice = await this.getCurrentPrice(
              `${order.baseCoin}`
            );
            const currentValue = baseVolume * currentPrice;
            totalProfit = currentValue - quoteVolume - feeInUsdt;
          } else {
            totalProfit = quoteVolume - baseVolume * priceAvg - feeInUsdt;
          }

          // Ajout des informations calculées
          order[Label.TOTAL_PROFITS] = totalProfit;
          // order[Label.TOTAL_FEES] = feeInUsdt;
          // order[Label.QUOTED_VOLUME] = quoteVolume;
          order[Label.BASE_VOLUME] = baseVolume;
          order[Label.CTIME] = new Date(
            parseInt(order.cTime as string)
          ).toISOString();
          order[Label.UTIME] = new Date(
            parseInt(order.uTime as string)
          ).toISOString();
        }
      }

      return orders;
    } catch (error) {
      console.error("Error in getHistoricOrders:", error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        `Exception in getHistoricOrders: ${JSON.stringify(error)}`
      );
      return [];
    }
  }

  getLimitHistoryPositions = async (
    limit: string = "100",
    symbol: string | undefined
  ): Promise<JSONArray> => {
    try {
      // Paramètres de la requête
      const params: JSONObject = {};
      if (symbol) {
        params[Label.SYMBOL] = this.config.botParameter.getSymbolV2(symbol);
      }
      params[Label.LIMIT] = "1000"; // On récupère le maximum pour pouvoir calculer correctement

      // Récupération des ordres historiques
      const response = await this.config.bitgetClientV2.getSpotHistoricOrders(
        params
      );
      let data = response?.data as unknown as JSONArray;

      if (!(data instanceof Array) || data.length === 0) {
        return [];
      }

      // Tri chronologique des ordres
      data = data.sort(
        (a, b) => parseFloat(a.cTime as string) - parseFloat(b.cTime as string)
      );

      let closedPositions: JSONArray = [];
      let currentPosition: JSONObject | null = null;
      let totalSize = 0;
      let totalInvested = 0;
      let totalFees = 0;

      // Analyse de chaque ordre pour reconstituer les positions
      for (const order of data) {
        const size = parseFloat((order.size as string) || "0");
        const price = parseFloat((order.priceAvg as string) || "0");

        if (
          Label.FEE_DETAIL in order &&
          (order[Label.FEE_DETAIL] as string).length > 0
        ) {
          const feeDetail = JSON.parse(order[Label.FEE_DETAIL] as string);
          const feeAmount = parseFloat(feeDetail["r"] || "0");
          const feeCoin = feeDetail["c"];

          // Conversion des frais en USDT
          let feeInUsdt = feeAmount;
          if (feeCoin !== "USDT") {
            const feeCoinPrice = await this.getCurrentPrice(
              order[Label.BASE_COIN] as string
            );
            feeInUsdt = feeAmount * feeCoinPrice;
          }
          totalFees += feeInUsdt;
        }

        if (order.side === OrderSideEnum.BUY) {
          if (totalSize === 0) {
            // Nouvelle position
            currentPosition = {
              [Label.SYMBOL]: symbol || order[Label.BASE_COIN],
              openTime: order.cTime,
              openPrice: price,
              size: size,
              type: "SPOT",
              fees: 0,
            };
          }
          totalSize += size;
          totalInvested += size * price;
        } else if (order.side === OrderSideEnum.SELL && currentPosition) {
          totalSize -= size;
          const saleValue = size * price;

          // Si la position est fermée (totalSize proche de 0)
          if (Math.abs(totalSize) < 0.000001) {
            const realizedPnl = saleValue - totalInvested - totalFees;
            const roi =
              ((saleValue - totalInvested - totalFees) / totalInvested) * 100;

            closedPositions.push({
              ...currentPosition,
              closeTime: order.cTime,
              closePrice: price,
              [Label.TOTAL_PROFITS]: realizedPnl,
              // [Label.TOTAL_FEES]: totalFees,
              [Label.ROE]: roi,
            });

            // Réinitialisation pour la prochaine position
            currentPosition = null;
            totalSize = 0;
            totalInvested = 0;
            totalFees = 0;
          }
        }
      }

      // Application de la limite sur les positions fermées
      const limitNumber = parseInt(limit);
      if (!isNaN(limitNumber) && limitNumber > 0) {
        closedPositions = closedPositions.slice(-limitNumber);
      }

      return closedPositions;
    } catch (error) {
      console.error("Error in getLimitHistoryPositions:", error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        `Exception in getLimitHistoryPositions: ${JSON.stringify(error)}`
      );
      return [];
    }
  };

  getAllPositions = async (): Promise<JSONArray> => {
    try {
      // 1. Récupérer tous les assets du compte spot
      const assets = (await this.config.bitgetClientV2.getSpotAccountAssets({}))
        .data as SpotAccountAssetV2[];

      const positions: JSONArray = [];

      // 2. Pour chaque asset non-USDT avec un solde
      for (const asset of assets) {
        const available = parseFloat(asset.available);
        const locked = parseFloat(asset.locked);
        const frozen = parseFloat(asset.frozen);
        const totalBalance = available + locked + frozen;

        if (totalBalance > 0 && asset.coin.toUpperCase() !== "USDT") {
          try {
            // 3. Construire le symbole et récupérer la position
            const symbol = asset.coin;
            const position = await this.getCurrentPosition(
              symbol,
              MixHoldSideEnum.LONG
            );

            if (Object.keys(position).length > 0) {
              // 4. Ajouter les informations supplémentaires
              const currentPrice = await this.getCurrentPrice(symbol);

              // Vérifier si le prix actuel est valide (coin pas retiré)
              if (!currentPrice || currentPrice <= 0) {
                console.error(
                  `Coin ${symbol} may have been delisted or withdrawn - current price unavailable`
                );
                continue;
              }

              // position[Label.CURRENT_PRICE] = currentPrice;
              position[Label.SYMBOL] = symbol;
              position[Label.OPEN_SIZE] = totalBalance;

              // Calcul du ROE
              const averageOpenPrice = parseFloat(
                position[Label.AVERAGE_OPEN_PRICE] as string
              );

              // Vérifier si le prix d'ouverture moyen est valide
              if (!averageOpenPrice || averageOpenPrice <= 0) {
                console.error(
                  `Coin ${symbol} has invalid average open price - may have been withdrawn`
                );
                continue;
              }

              const unrealizedPnl =
                totalBalance * (currentPrice - averageOpenPrice);
              const roe =
                ((currentPrice - averageOpenPrice) / averageOpenPrice) * 100;

              position[Label.ROE] = roe;
              position[Label.UNREALIZED_PL] = unrealizedPnl;
              // position[Label.TOTAL_BALANCE] = totalBalance;
              position[Label.AVAILABLE] = available;
              // position[Label.LOCKED] = locked;
              position[Label.HOLD_SIDE] = MixHoldSideEnum.LONG;
              position[Label.OPEN_PRICE_AVG] = averageOpenPrice;
              position[Label.MARK_PRICE] = averageOpenPrice;
              position[Label.TOTAL] = totalBalance;

              positions.push(position);
            } else {
              console.error(
                `No position data found for coin ${symbol} - may have been withdrawn or delisted`
              );
            }
          } catch (error) {
            console.error(
              `Error processing position for ${asset.coin} (possibly withdrawn/delisted):`,
              (error &&
                typeof error === "object" &&
                "body" in error &&
                (error).body?.msg) ||
                error
            );
          }
        }
      }

      return positions;
    } catch (error) {
      console.error("Error in getAllPositions:", error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        `Exception in getAllPositions: ${JSON.stringify(error)}`
      );
      return [];
    }
  };

  getCurrentPosition = async (
    symbol: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mixHoldSideEnum: MixHoldSideEnum
  ) => {
    const result: JSONObject = {};
    const params: JSONObject = {};
    params[Label.SYMBOL] = this.config.botParameter.getSymbolV2(symbol);
    params[Label.LIMIT] = "1000";

    const data = (await this.config.bitgetClientV2.getSpotHistoricOrders(params))
      .data as unknown as JSONArray;
    const orderBuy: JSONObject[] = [];
    if (data instanceof Array) {
      for (const element of data) {
        if (element.orderType === "market") {
          if (element.side === OrderSideEnum.BUY) {
            orderBuy.push(element);
          } else {
            break;
          }
        }
      }
    }
    if (orderBuy.length === 0) {
      return result;
    }

    let sumPrice = 0;

    for (const order of orderBuy) {
      sumPrice += parseFloat(order.priceAvg as string);
    }

    const avgPrice = sumPrice / orderBuy.length;

    result[Label.SYMBOL] = symbol;
    result[Label.AVERAGE_OPEN_PRICE] = avgPrice;
    result[Label.OPEN_SIZE] = orderBuy[0].size;
    result[Label.LEVERAGE] = "1";
    return result;
  };

  getHistoryPositions = async (symbol: string): Promise<JSONArray> => {
    const orderSell: JSONObject[] = [];
    const orderBuy: JSONObject[] = [];
    const params: JSONObject = {};
    params[Label.SYMBOL] = this.config.botParameter.getSymbolV2(symbol);
    // params[Label.SYMBOL] = symbol;
    // params[Label.LIMIT] = "1000";

    const paramsType: GetSpotHistoryOrdersRequestV2 =
      params as unknown as GetSpotHistoryOrdersRequestV2;
    let data = (
      await this.config.bitgetClientV2.getSpotHistoricOrders(paramsType)
    ).data as unknown as JSONArray;

    if (data instanceof Array) {
      data = data.sort((a, b) => parseFloat(a.cTime as string) - parseFloat(b.cTime as string));
      for (const element of data) {
        if ((element.side as string)?.toLowerCase() === OrderSideEnum.SELL) {
          orderSell.push(element);
        } else if ((element.side as string)?.toLowerCase() === OrderSideEnum.BUY) {
          orderBuy.push(element);
        }
      }
    }
    if (orderSell.length === 0) {
      return [];
    }

    return orderSell as unknown as JSONArray;
  };

  getQtyToInvest(symbol: string, currentPrice: number): Promise<number> {
    console.log(`Calculating quantity to invest for ${symbol} at price ${currentPrice}`);
    throw new Error("Method not implemented.");
  }

  getCurrentPrice = async (symbol: string) => {
    const params: JSONObject = {};
    params[Label.SYMBOL] = this.config.botParameter.getSymbolV2(symbol);
    params[Label.PRODUCT_TYPE] = this.config.botParameter.getProductType();
    try {
      const params: SpotCandlesRequestV2 = {
        symbol: this.config.botParameter.getSymbolV2(symbol),
        granularity: CandlestickIntervalEnum.HOURLY
          .spotIntervalId as SpotKlineInterval,
        limit: "100",
        endTime: new Date().getTime().toString(),
      };
      const data = (await this.config.bitgetClientV2.getSpotCandles(params))
        .data as unknown as number[][];

      // Vérifier si les données sont disponibles
      if (!data || data.length === 0) {
        console.error(
          `No price data available for ${symbol} - coin may have been withdrawn or delisted`
        );
        return 0;
      }

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

      const closePrice = newCandlesticks[0]?.close || 0;
      if (closePrice <= 0) {
        console.error(
          `Invalid close price (${closePrice}) for ${symbol} - coin may have been withdrawn or delisted`
        );
        return 0;
      }

      return closePrice;
    } catch (error) {
      console.error(
        `Error getting current price for ${symbol} (possibly withdrawn/delisted):`,
        error
      );
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        `Exception while getCurrentPrice for ${symbol} (possibly withdrawn): ${JSON.stringify(
          error
        )}`
      );
      return 0; // Retourner 0 au lieu de throw pour éviter de casser le processus
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLastOrder = async (symbol: string, _mixHoldSideEnum: MixHoldSideEnum) => {
    const params: JSONObject = {};
    params[Label.SYMBOL] = this.config.botParameter.getSymbolV2(symbol);
    params[Label.LIMIT] = "1000";
    const paramsType: SpotHistoricTradesRequestV2 =
      params as unknown as SpotHistoricTradesRequestV2;

    try {
      const response = await this.config.bitgetClientV2.getSpotHistoricTrades(
        paramsType
      );
      if (response?.data?.length > 0) {
        const order = response?.data[0] as unknown as JSONObject;
        return order;
      }
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Exception while getLastOrder " + JSON.stringify(error)
      );
    }
    return {};
  };

  getSymbolQty = async (symbol: string): Promise<number> => {
    const params: JSONObject = {};
    params[Label.COIN] = symbol.toLocaleLowerCase();
    try {
      const data = (await this.config.bitgetClientV2.getSpotAccountAssets(params))
        .data;
      const available = data[0].available as unknown as number;

      return available;
    } catch (error) {
      const message =
        "Exception while getSymbolQty for " +
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
    return 0;
  };

  setGroup(group: Group): void {
    this.group = group;
  }
  getGroup(): Group {
    return this.group;
  }
}

export { SpotCommon };
