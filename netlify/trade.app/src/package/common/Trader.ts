import {
  Group,
  JSONObject,
  MixHoldSideEnum,
  Profile,
  TradeParam,
} from "./MapperType";
import { InvestorProfile } from "@prisma/client";
import { Config, SecondaryAccountConfig } from "./Config";
import { HandleTrader } from "./HandleTrader";
import * as asciichart from "asciichart";
import { Account } from "./Account";
import { Candle } from "./Candle";
import { FilterRoi } from "../filter/Filter";
import { FutureAccount } from "../future/FutureAccount";
import { FutureInvestorAccount } from "../future/investor/FutureInvestorAccount";
import { getStrategy } from "../strategy";
import { SpotAccount } from "../spot/SpotAccount";
import axios from "axios";
import { Asset } from "../../types/lib";
import { persistOrder, persistPositions } from "./Persistence";

class Trader extends HandleTrader {
  private candle: Candle;
  public account: Account;
  private message: string;
  private investorAgent: InvestorProfile | undefined;

  constructor(config: Config, account: Account, candle: Candle) {
    super(config, account);
    this.account = account;
    this.candle = candle;
    this.message = "";
  }

  trade = async () => {
    let params;
    if (
      this.account instanceof FutureAccount ||
      this.account instanceof FutureInvestorAccount
    ) {
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
      process.env.APP_ENV === Profile.PROD &&
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

      // Garde: pas de données => on stoppe proprement (évite RangeError asciichart)
      if (!asset?.closings || asset.closings.length === 0) {
        console.warn(
          "No candle data fetched; skip symbol",
          symbol,
          "period=",
          group.period.futureIntervalId
        );
        return;
      }

      const lastOrderLong: JSONObject = await this.account.getLastOrder(
        symbol,
        MixHoldSideEnum.LONG
      );
      const lastOrderShort: JSONObject = await this.account.getLastOrder(
        symbol,
        MixHoldSideEnum.SHORT
      );

      const initPos = await this.getPositions(symbol, group);
      const initPosLong: JSONObject = initPos.initPosLong;
      const initPosShort: JSONObject = initPos.initPosShort;

      const strategyResult = getStrategy(
        asset,
        group.indicator.type,
        group.indicator.params
      );

      const executionLength = Math.min(
        strategyResult.length,
        asset.closings.length
      );
      for (let index = 0; index < executionLength; index++) {
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

      // (graph inutilisé; retiré pour éviter confusion et allocations inutiles)

      await this.logRoe(asset, symbol);
      // Affiche le mini chart uniquement en production pour limiter le bruit en DEV
  if (process.env.APP_ENV === Profile.PROD) {
        this.logChart(asset);
      }
    } catch (error) {
      console.error(error);
      await this.config.telegramClient.sendMessage(
        this.config.telegramGroupOrderId,
        "Main error=" + JSON.stringify(error)
      );
    }
  }

  private logChart(asset: Asset) {
    if (!asset?.closings || asset.closings.length < 2) {
      return; // rien à tracer
    }
    // Types de asciichart parfois incomplets -> on reste simple pour éviter l'erreur TS.
    const series = asset.closings.slice(-50);
    try {
      // on force un typage minimaliste pour la fonction plot absente des defs
      const plotFn = (
        asciichart as unknown as {
          plot: (s: number[], o?: { height?: number }) => string;
        }
      ).plot;
      const chart: string = plotFn(series, { height: 4 });
      console.log("\n", chart);
    } catch {
      // silencieux: pas critique si le chart échoue
    }
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

  setInvestorAgent(currentInvestor: InvestorProfile | undefined) {
    this.investorAgent = currentInvestor;
  }

  async afterTradePersist(
    type: "ENTRY" | "EXIT",
    success: boolean,
    tradeParam: TradeParam,
    price: number
  ) {
  // Uniquement en DEV pour investisseurs fictifs
  if (!this.config.botParameter.isDevEnv()) return;
  if (!success || !this.investorAgent) return;
    try {
      await persistOrder({
        investor: this.investorAgent,
        symbol: tradeParam.symbol,
        side:
          type === "ENTRY"
            ? tradeParam.mixHoldSideEnum === MixHoldSideEnum.LONG
              ? "buy"
              : "sell"
            : "flat",
        posSide: tradeParam.mixHoldSideEnum,
        currentPrice: price,
        rawOrder: tradeParam.lastOrder,
        lastOrder: tradeParam.lastOrder,
      });

      if (this.account instanceof FutureAccount) {
        const posLong = await this.account.getCurrentPosition(
          tradeParam.symbol,
          MixHoldSideEnum.LONG
        );
        const posShort = await this.account.getCurrentPosition(
          tradeParam.symbol,
          MixHoldSideEnum.SHORT
        );
        // Typage FutureGroup sécurisé
        const group = tradeParam.group as unknown as {
          margeLeverage: number;
          marginMode: string;
        };
        await persistPositions(
          this.investorAgent,
          tradeParam.symbol,
          { long: posLong, short: posShort } as Record<string, JSONObject>,
          {
            leverage: group.margeLeverage,
            marginMode: group.marginMode,
            marginCoin: "USDT",
          }
        );
      }

      // Notification Telegram pour suivi des investisseurs fictifs
      try {
        const action = type === "ENTRY" ? "ENTRY" : "EXIT";
        await this.config.telegramClient.sendMessage(
          this.config.telegramGroupOrderId,
          `[DEV INVESTOR] ${action} ${tradeParam.symbol} side=${tradeParam.mixHoldSideEnum} price=${price}`
        );
      } catch (e) {
        console.error("afterTradePersist telegram error", e);
      }
    } catch (e) {
      console.error("afterTradePersist error", e);
    }
  }
}

export { Trader };
