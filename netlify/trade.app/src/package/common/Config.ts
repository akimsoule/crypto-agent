import { RestClientV2 } from "bitget-api";
import TelegramBot from "node-telegram-bot-api";
import { BotParameter } from "../config/BotParameter";
import { DevFilter } from "../filter/Filter";
import { CachedBitgetClient } from "./CachedBitgetClient";
import {
  CandlestickIntervalEnum,
  MixMarginModeEnum,
  Params,
  Profile,
} from "./MapperType";

class CustomTelegramBot extends TelegramBot {
  private botParameter: BotParameter;

  constructor(
    token: string,
    botParameter: BotParameter,
    options?: TelegramBot.ConstructorOptions
  ) {
    super(token, options);
    this.botParameter = botParameter;
  }

  sendMessage(
    chatId: TelegramBot.ChatId,
    text: string,
    options?: TelegramBot.SendMessageOptions
  ): Promise<TelegramBot.Message> {
    if (this.botParameter.isProdEnv()) {
      return super.sendMessage(chatId, text, options);
    } else {
      const message = {} as TelegramBot.Message;
      return Promise.resolve(message);
    }
  }
}

class Config {
  public bitgetClientV2: RestClientV2;
  public cachedBitgetClient: CachedBitgetClient;
  public botParameter: BotParameter;
  public telegramClient: TelegramBot;
  public telegramGroupOrderId: string;

  public static MAIN_DEFAULT_CONFIG = (
    profile: Profile = Profile.PROD
  ): Config =>
    new Config({
      futureParam: {
        groups: [
          {
            period: CandlestickIntervalEnum.HOURLY,
            indicator: { type: "DOUBLE_AVG" },
            exit: false,
            position: null,
            activeLimit: false,
            filter: new DevFilter(),
            margeLeverage: 5,
            marginMode: MixMarginModeEnum.CROSSED,
            symbols: [],
          },
        ],
      },
      spotParam: { groups: [] },
      profiles: [Profile.FUTURE, profile, Profile.DEV],
    });

  //default constructor(params: Params) with main account
  constructor(params: Params) {
    this.bitgetClientV2 = new RestClientV2({
      apiKey: process.env.ACCOUNT_API_KEY_MAIN,
      apiSecret: process.env.ACCOUNT_SECRET_KEY_MAIN,
      apiPass: process.env.API_PASS,
    });

    // Créer une instance du client avec cache
    this.cachedBitgetClient = new CachedBitgetClient(this.bitgetClientV2);

    this.botParameter = new BotParameter(params);
    this.telegramClient = new CustomTelegramBot(
      process.env.TELEGRAM_KEY as string,
      this.botParameter,
      {
        polling: false,
      }
    );
    this.telegramGroupOrderId = process.env.TELEGRAM_GROUP_ID as string;
  }
}

class SecondaryAccountConfig extends Config {
  public static SECOND_DEFAULT_CONFIG = (profile: Profile = Profile.PROD) =>
    new SecondaryAccountConfig({
      futureParam: {
        groups: [
          {
            period: CandlestickIntervalEnum.HOURLY,
            indicator: { type: "DOUBLE_AVG" },
            exit: false,
            position: null,
            activeLimit: false,
            filter: new DevFilter(),
            margeLeverage: 5,
            marginMode: MixMarginModeEnum.CROSSED,
            symbols: [],
          },
        ],
      },
      spotParam: { groups: [] },
      profiles: [Profile.FUTURE, profile, Profile.DEV],
    });

  constructor(params: Params) {
    super(params);
    this.bitgetClientV2 = new RestClientV2({
      apiKey: process.env.ACCOUNT_API_KEY_SECOND,
      apiSecret: process.env.ACCOUNT_SECRET_KEY_SECOND,
      apiPass: process.env.API_PASS,
    });
  }
}

export { Config, SecondaryAccountConfig };
