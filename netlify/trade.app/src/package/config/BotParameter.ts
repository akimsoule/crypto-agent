import { Label } from "../common/Label";
import { Params, Profile } from "../common/MapperType";

class BotParameter {
  params: Params;

  constructor(params: Params) {
    this.params = params;
  }

  isDebug(): boolean {
    return this.params.profiles.includes(Profile.DEBUG);
  }

  isSimEnv = () => {
    return this.params.profiles.includes(Profile.SIM);
  };

  isProdEnv = () => {
    return (
  process.env.APP_ENV === "production" ||
      this.params.profiles.includes(Profile.PROD)
    );
  };

  isDevEnv = () => {
    return (
  process.env.APP_ENV === "development" ||
      this.params.profiles.includes(Profile.DEV)
    );
  };

  isFutureEnv = () => {
    return this.params.profiles.includes(Profile.FUTURE);
  };

  isSpotEnv = () => {
    return this.params.profiles.includes(Profile.SPOT);
  };

  getSimSymbol = (symbol: string) => {
    return (Label.S + symbol + Label.S + Label.USDT).toUpperCase();
  };

  getFutureMarginCoin = () => {
    let margin = "";
    if (this.isSimEnv()) {
      margin += Label.S;
    }
    margin += Label.USDT;
    return margin.toUpperCase();
  };

  getSymbolIfSimV2 = (symbol: string) => {
    if (this.isSimEnv()) {
      return this.getSimSymbol(symbol);
    }
    return (symbol + Label.USDT).toUpperCase();
  };

  getSymbolV2 = (symbol: string) => {
    return (symbol + Label.USDT).toUpperCase();
  };

  getProductType = () => {
    if (this.isSimEnv()) {
      return (Label.S + Label.USDT_FUTURES).toUpperCase();
    }
    return Label.USDT_FUTURES.toUpperCase();
  };
}

export { BotParameter };
