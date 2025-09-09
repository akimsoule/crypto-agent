import { Config } from "../common/Config";
import { InvestorProfile } from "@prisma/client";
import { Trader } from "../common/Trader";
import { FutureAccount } from "../future/FutureAccount";
import { FutureCandle } from "../future/FutureCandle";
import { FutureInvestorAccount } from "../future/investor/FutureInvestorAccount";
import { FutureInvestorCandle } from "../future/investor/FutureInvestorCandle";
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

class BeanInvestor {
	futureTrader: Trader;
	spotTrader: Trader;

	constructor(config: Config, investor: InvestorProfile) {
		// Future side: DB-backed investor account + Coinpaprika candles
		const futureAccount = new FutureInvestorAccount(investor.id);
		const futureCandle = new FutureInvestorCandle(config);
		this.futureTrader = new Trader(config, futureAccount, futureCandle);

		// Spot side: keep standard spot components (not used in our flow, but required by Runner types)
		const spotAccount = new SpotAccount(config);
		const spotCandle = new SpotCandle(config);
		this.spotTrader = new Trader(config, spotAccount, spotCandle);
	}
}

export { Bean, BeanInvestor };
