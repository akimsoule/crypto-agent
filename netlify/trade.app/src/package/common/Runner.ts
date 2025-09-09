
import { Bean, BeanInvestor } from "../config/Bean";
import { Config } from "./Config";
import { Trader } from "./Trader";
import { InvestorProfile } from "@prisma/client";

export class Runner {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  run = async (currentInvestor?: InvestorProfile) => {
    // Utiliser BeanInvestor en mode DEV si un investisseur courant est fourni
    const useInvestorBean =
      !!currentInvestor && this.config.botParameter.isDevEnv();
    const bean = useInvestorBean
      ? new BeanInvestor(this.config, currentInvestor)
      : new Bean(this.config);
    const startTime = performance.now();

    let futureTrader : Trader | undefined;
    let spotTrader : Trader | undefined;
    if (this.config.botParameter.isFutureEnv()) {
      futureTrader = bean.futureTrader as Trader;
      futureTrader.setInvestorAgent(currentInvestor);
    } else if (this.config.botParameter.isSpotEnv()) {
      spotTrader = bean.spotTrader as Trader;
      spotTrader.setInvestorAgent(currentInvestor);
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
