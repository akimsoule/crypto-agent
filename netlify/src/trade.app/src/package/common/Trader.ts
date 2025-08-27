import {
  Group,
  JSONObject,
  MixHoldSideEnum,
  Profile,
  TradeParam,
} from "./MapperType";
import { Config, SecondaryAccountConfig } from "./Config";
import { HandleTrader } from "./HandleTrader";
import * as asciichart from "asciichart";
import { Account } from "./Account";
import { Candle } from "./Candle";
import { FilterRoi } from "../filter/Filter";
import { FutureAccount } from "../future/FutureAccount";
import { getStrategy } from "../strategy";
import { SpotAccount } from "../spot/SpotAccount";
import axios from "axios";
import { Asset } from "../../types/lib";

class Trader extends HandleTrader {
  private candle: Candle;
  public account: Account;
  private message: string;

  constructor(config: Config, account: Account, candle: Candle) {
    super(config, account);
    this.account = account;
    this.candle = candle;
    this.message = "";
  }

  trade = async () => {
    let params;
    if (this.account instanceof FutureAccount) {
      params = this.config.botParameter.params.futureParam;
    } else if (this.account instanceof SpotAccount) {
      params = this.config.botParameter.params.spotParam;
    }
    if (!params) {
      throw new Error("params is null");
    }

    const groups: Group[] = params.groups;
    console.log("profiles=", this.config.botParameter.params.profiles);
    if (groups) {
      for (const group of groups) {
        const symbols = group.symbols;
        for (const symbol of symbols) {
          await this.tradeSymbol(symbol, group);
        }
      }
    }

    const toDate = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Toronto" })
    );
    const hour = toDate.getHours();
    const minute = toDate.getMinutes();
    const configName =
      this.config instanceof SecondaryAccountConfig
        ? "Secondary config"
        : "Main config";
    let message = `[From:${process.platform} - ${configName}][At:${hour
      .toString()
      .padStart(2, "0")}:${minute.toString().padStart(2, "0")}]`;

    if (this.message && this.message.length > 0) {
      message += "\n" + this.message;
    }

    console.log(message);

    if (
      process.env.REACT_APP_ENV === Profile.PROD &&
      (hour === 8 || hour === 16) &&
      minute >= 0 &&
      minute <= 3
    ) {
      try {
        const data = (await axios.get("https://zenquotes.io/api/random")).data;
        const quote = data[0]; // Accède au premier élément du tableau
        message += `\n${quote.q} By ${quote.a}`;
      } catch (e) {
        console.log(e);
      }

      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        message
      );
    }
  };

  async tradeSymbol(symbol: string, group: Group) {
    console.log(
      "symbol=",
      this.config.botParameter.getSymbolIfSimV2(symbol),
      ", period=",
      group.period.futureIntervalId,
      ", profiles=",
      this.config.botParameter.params.profiles,
      ", strategy=",
      JSON.stringify(group.indicator)
    );
    try {
      const asset: Asset = await this.candle.getAsset(
        symbol,
        group.period,
        new Date(),
        100
      );

      const lastOrderLong: JSONObject = await this.account.getLastOrder(
        symbol,
        MixHoldSideEnum.LONG
      );
      const lastOrderShort: JSONObject = await this.account.getLastOrder(
        symbol,
        MixHoldSideEnum.SHORT
      );

      const {
        initPosLong,
        initPosShort,
      }: { initPosLong: JSONObject; initPosShort: JSONObject } =
        await this.getPositions(symbol, group);

      const strategyResult = getStrategy(
        asset,
        group.indicator.type,
        group.indicator.params
      );

      for (let index = 0; index < strategyResult.length; index++) {
        const actionLong = strategyResult.longStrategy[index];
        const actionShort = strategyResult.shortStrategy[index];

        const longTradeParam: TradeParam = {
          symbol: symbol,
          group: group,
          action: actionLong,
          index,
          asset: asset,
          lastOrder: lastOrderLong,
          activeLimit: group.activeLimit,
          mixHoldSideEnum: MixHoldSideEnum.LONG,
          botParameter: this.config.botParameter,
          closings: asset.closings,
          position: initPosLong,
          positionCompl: initPosShort,
          currentPrice: asset.closings[index],
        };
        const shortTradeParam: TradeParam = {
          symbol: symbol,
          group: group,
          action: actionShort,
          index,
          asset: asset,
          lastOrder: lastOrderShort,
          activeLimit: group.activeLimit,
          mixHoldSideEnum: MixHoldSideEnum.SHORT,
          botParameter: this.config.botParameter,
          closings: asset.closings,
          position: initPosShort,
          positionCompl: initPosLong,
          currentPrice: asset.closings[index],
        };

        await this.handleStrategy(longTradeParam);
        await this.handleStrategy(shortTradeParam);
      }

      const graph = new Array(strategyResult.length);
      for (let i = 0; i < graph.length; i++) {
        graph[i] = asset.closings[i];
      }

      await this.logRoe(asset, symbol);
      this.logChart(asset);
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Main error=" + JSON.stringify(error)
      );
    }
  }

  private logChart(asset: Asset) {
    const chart = asciichart.plot([asset.closings.slice(0, 50)], {
      height: 4,
      padding: "",
      colors: [asciichart.lightyellow],
    });

    console.log("\n", chart);
  }

  private async logRoe(asset: Asset, symbol: string) {
    let message = "";
    const currentPrice = asset.closings[asset.closings.length - 1];
    if (this.account instanceof FutureAccount) {
      const posLong = await this.account.getCurrentPosition(
        symbol,
        MixHoldSideEnum.LONG
      );
      const posShort = await this.account.getCurrentPosition(
        symbol,
        MixHoldSideEnum.SHORT
      );
      const filterRoi = this.account
        .getGroup()
        .filter.filters.filters.find(
          (filter) => filter instanceof FilterRoi
        ) as FilterRoi;
      if (filterRoi) {
        const roeLong = filterRoi.getReturnOnEquity(posLong, currentPrice);
        const roeShort = filterRoi.getReturnOnEquity(posShort, currentPrice);

        if (roeLong) {
          console.log(
            "Current own ROE long=",
            roeLong + " " + this.config.botParameter.getSymbolIfSimV2(symbol)
          );
          message +=
            "Current own ROE long=" +
            roeLong +
            " " +
            this.config.botParameter.getSymbolIfSimV2(symbol);
        }

        if (roeShort) {
          console.log(
            "Current own ROE short=",
            roeShort + " " + this.config.botParameter.getSymbolIfSimV2(symbol)
          );
          message +=
            "\nCurrent own ROE short=" +
            roeShort +
            " " +
            this.config.botParameter.getSymbolIfSimV2(symbol);
        }
      }
    }
    if (message.length > 0) {
      this.setMessage(message);
    }
  }

  setMessage(message: string): void {
    this.message = message;
  }

  private async getPositions(symbol: string, group: Group) {
    let initPosLong: JSONObject = {};
    let initPosShort: JSONObject = {};
    if (this.account instanceof FutureAccount) {
      initPosLong = await this.account.getCurrentPosition(
        symbol,
        MixHoldSideEnum.LONG
      );
      initPosShort = await this.account.getCurrentPosition(
        symbol,
        MixHoldSideEnum.SHORT
      );
      await this.account.init(group, symbol, [initPosLong, initPosShort]);
    } else if (this.account instanceof SpotAccount) {
      initPosLong = await this.account.getCurrentPosition(
        symbol,
        MixHoldSideEnum.LONG
      );
      initPosShort = {};
    }
    return { initPosLong, initPosShort };
  }
}

export { Trader };
