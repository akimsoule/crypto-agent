import { Bean } from "../config/Bean";
import { Config } from "./Config";

export class Runner {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  run = async () => {
    const bean = new Bean(this.config);
    const startTime = performance.now();
    let futureTrader;
    let spotTrader;
    if (this.config.botParameter.isFutureEnv()) {
      futureTrader = bean.futureTrader;
    } else if (this.config.botParameter.isSpotEnv()) {
      spotTrader = bean.spotTrader;
    }
    if (futureTrader) {
      await futureTrader.trade();
    }
    if (spotTrader) {
      await spotTrader.trade();
    }

    const endTime = performance.now();
    const timeInSecond = (endTime - startTime) / 1000;
    const subject = timeInSecond.toFixed(2);
    console.log(`Execution time ${subject} seconds`);
  };
}
