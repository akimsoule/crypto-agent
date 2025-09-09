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

dotenv.config();

const runner = async (profs: Profile[] | undefined) => {
  const params: Params = {
    futureParam: {
      groups: [
        {
          period: CandlestickIntervalEnum.HOURLY,
          indicator: { type: "OR_MACD_ENV" },
          exit: false,
          position: null,
          activeLimit: false,
          filter: new StandardFilter(),
          margeLeverage: 5,
          marginMode: MixMarginModeEnum.CROSSED,
          symbols: ["BTC"],
        } as FutureGroup,
      ] as FutureGroup[],
    },
    spotParam: { groups: [] as SpotGroup[] },
    profiles: [Profile.FUTURE, Profile.SIM, ...(profs || [])],
  };

  await new Runner(new Config(params)).run();
};

export { runner };
