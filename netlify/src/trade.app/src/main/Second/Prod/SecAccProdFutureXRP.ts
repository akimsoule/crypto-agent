import dotenv from "dotenv";
import { SecondaryAccountConfig } from "../../../package/common/Config";
import {
  CandlestickIntervalEnum,
  FutureGroup,
  MixHoldSideEnum,
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
          exit: true,
          position: MixHoldSideEnum.LONG,
          activeLimit: false,
          filter: new StandardFilter(),
          margeLeverage: 10,
          marginMode: MixMarginModeEnum.CROSSED,
          symbols: ["XRP"],
        } as FutureGroup,
      ] as FutureGroup[],
    },
    spotParam: { groups: [] as SpotGroup[] },
    profiles: [Profile.FUTURE, ...(profs || [])],
  };

  await new Runner(new SecondaryAccountConfig(params)).run();
};

export { runner };
