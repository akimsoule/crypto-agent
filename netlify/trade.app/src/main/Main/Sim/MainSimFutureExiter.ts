import dotenv from "dotenv";
import { Config } from "../../../package/common/Config";
import {
  CandlestickIntervalEnum,
  FutureGroup,
  MixMarginModeEnum,
  Params,
  Profile,
  SpotGroup,
} from "../../../package/common/MapperType";
import { Runner } from "../../../package/common/Runner";
import { StandardFilter } from "../../../package/filter/Filter";
import { FutureAccount } from "../../../package/future/FutureAccount";

dotenv.config();

const runner = async (profs: Profile[] | undefined) => {
  //récupérer les cryptos qui ont des positions ouverts
  const futureAccount = new FutureAccount(
    Config.MAIN_DEFAULT_CONFIG(Profile.SIM)
  );
  const symbols = (await futureAccount.getAllPositions())
    .map((pos) => pos.symbol as string)
    .map((symb) => symb.replace("SUSDT", "").replace("USDT", ""));

  const params: Params = {
    futureParam: {
      groups: [
        {
          period: CandlestickIntervalEnum.HOURLY,
          indicator: { type: "OR_MACD_ENV" },
          exit: true,
          position: null,
          activeLimit: false,
          filter: new StandardFilter(),
          margeLeverage: 5,
          marginMode: MixMarginModeEnum.CROSSED,
          symbols: symbols,
        } as FutureGroup,
      ] as FutureGroup[],
    },
    spotParam: { groups: [] as SpotGroup[] },
    profiles: [Profile.FUTURE, Profile.SIM, ...(profs || [])],
  };

  await new Runner(new Config(params)).run();
};

export { runner };
