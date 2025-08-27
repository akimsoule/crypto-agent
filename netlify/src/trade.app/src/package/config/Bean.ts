import { Config } from "../common/Config";
import { Trader } from "../common/Trader";
import { FutureAccount } from "../future/FutureAccount";
import { FutureCandle } from "../future/FutureCandle";
import { SpotAccount } from "../spot/SpotAccount";
import { SpotCandle } from "../spot/SpotCandle";

class Bean {
  futureTrader: Trader;
  spotTrader: Trader;

  constructor(config: Config) {
    const futureAccount = new FutureAccount(config);
    const futureCandle = new FutureCandle(config);
    this.futureTrader = new Trader(config, futureAccount, futureCandle);

    const spotAccount = new SpotAccount(config);
    const spotCandle = new SpotCandle(config);
    this.spotTrader = new Trader(config, spotAccount, spotCandle);
  }
}

export { Bean };
