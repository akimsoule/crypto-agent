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

// Wrapper léger pour éviter problèmes d'héritage/ESM et rendre l'appel no-op hors prod
interface TelegramLike {
  sendMessage(chatId: string | number, text: string): Promise<unknown>;
}

class SafeTelegram {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private inner: TelegramLike | null;
  private enabled: boolean;
  constructor(token: string | undefined, enabled: boolean) {
    this.enabled = Boolean(token && enabled);
  // On cast en unknown puis TelegramLike pour isoler l'usage minimal
  this.inner = this.enabled && token ? (new (TelegramBot as unknown as { new(token: string, opts?: unknown): TelegramLike })(token, { polling: false }) as unknown as TelegramLike) : null;
  }
  async sendMessage(chatId: string | number, text: string): Promise<void> {
    if (!this.inner) return;
    try {
      await this.inner.sendMessage(chatId, text);
    } catch {
      // silencieux
    }
  }
}

class Config {
  public bitgetClientV2: RestClientV2;
  public cachedBitgetClient: CachedBitgetClient;
  public botParameter: BotParameter;
  public telegramClient: SafeTelegram;
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
  const telegramKey = process.env.TELEGRAM_KEY;
  const telegramGroup = process.env.TELEGRAM_GROUP_ID || '0';
  this.telegramClient = new SafeTelegram(telegramKey, this.botParameter.isProdEnv());
  this.telegramGroupOrderId = telegramGroup;
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
