import * as asciichart from "asciichart";

import { Config, SecondaryAccountConfig } from "../package/common/Config";
import {
  CandlestickIntervalEnum,
  FutureGroup,
  JSONArray,
  JSONObject,
  MixHoldSideEnum,
  MixMarginModeEnum,
  Params,
  Profile,
  SpotGroup,
} from "../package/common/MapperType";
import { StandardFilter } from "../package/filter/Filter";
import { FutureCommon } from "../package/future/FutureCommon";
import { SpotCommon } from "../package/spot/SpotCommon";
import { runner as runnner1 } from "./Main/Sim/MainAccSimFutureXRP";

const prof = Profile.PROD;
const params: Params = {
  futureParam: {
    groups: [
      {
        period: CandlestickIntervalEnum.HOURLY,
        indicator: { type: "MACD", params: [12, 26, 9] },
        exit: null,
        position: null,
        activeLimit: false,
        filter: new StandardFilter(),
        margeLeverage: 5,
        marginMode: MixMarginModeEnum.CROSSED,
        symbols: ["XRP"],
      } as FutureGroup,
    ] as FutureGroup[],
  },
  spotParam: {
    groups: [
      {
        period: CandlestickIntervalEnum.HOURLY,
        indicator: { type: "MACD", params: [12, 26, 9] },
        filter: new StandardFilter(),
        position: MixHoldSideEnum.LONG,
        activeLimit: false,
        exit: true,
        symbols: ["MATIC"],
      } as SpotGroup,
    ] as SpotGroup[],
  },
  profiles: [
    Profile.FUTURE,
    Profile.SPOT,
  prof ?? (process.env.APP_ENV as Profile),
    Profile.SIM,
  ],
};

// Type minimal local pour ne pas dépendre des types Netlify (évite le rouge si non résolus)
interface SimpleEvent { queryStringParameters?: Record<string, string>; }

const runner = async (event: SimpleEvent) => {
  const queryParams = event.queryStringParameters;

  console.log(queryParams);

  let crypto = "XRP";
  let position = MixHoldSideEnum.LONG;
  let config = new Config(params);
  let common: FutureCommon | SpotCommon = new FutureCommon(config);

  if (queryParams) {
    // CRYPTO
    if (queryParams.crypto) {
      crypto = queryParams.crypto;
    }

    if (queryParams.position) {
  position = queryParams.position.toLowerCase() as MixHoldSideEnum;
    }

    // PROFILE
    if (queryParams.profiles) {
      const profiles: Profile[] = queryParams.profiles
        .split(",")
  .map((p) => p.toLowerCase())
        .map((p) => p as Profile);
      params.profiles = profiles;
      console.log(params.profiles);
    }

    // CONFIG
    if (queryParams.config) {
      if (queryParams.config.includes("Primary")) {
        config = new Config(params);
      } else if (queryParams.config.includes("Secondary")) {
        config = new SecondaryAccountConfig(params);
      }
    }

    // COMMON
    if (queryParams.common) {
      if (queryParams.common.includes("Future")) {
        common = new FutureCommon(config);
      } else if (queryParams.common.includes("Spot")) {
        common = new SpotCommon(config);
      }
    }

    // RESULT TYPE
    if (queryParams.resultType) {
      if (queryParams.resultType.includes("RUNNERS")) {
        if (queryParams.profiles?.includes(Profile.DEV)) {
          await runners([Profile.DEV]);
        } else {
          await runners([Profile.PROD]);
        }
      } else if (queryParams.resultType.includes("MIN_INVEST")) {
        await getMinToInvest(common, crypto, position);
      } else if (queryParams.resultType.includes("LOG_EVOLUTION")) {
        await logEvolutions(common, crypto);
      }
    } else if (queryParams?.profiles?.includes(Profile.DEV)) {
      await runners([Profile.DEV]);
    } else {
      await runners([Profile.PROD]);
    }
  }
};


async function runners(profils: Profile[]) {
  await runnner1(profils);
}


function logChart(series: number[]) {
  if (!series || !Array.isArray(series) || series.length === 0) return;
  const data = series.slice(-50);
  try {
    const plotFn = (asciichart as unknown as { plot: (s: number[], o?: { height?: number }) => string }).plot;
    const chart = plotFn(data, { height: 4 });
    console.log("\n", chart);
  } catch {
    // Chart non critique
  }
}


async function getMinToInvest(
  common: FutureCommon | SpotCommon,
  crypto: string,
  position: MixHoldSideEnum
) {
  console.log("position=", position);
  const currentPrice = await common.getCurrentPrice(crypto);
  const amount = await common.getQtyToInvest(crypto, currentPrice, position);
  console.log(
    `Min for Trader ${crypto} ${amount} for ${JSON.stringify(
      common.config.botParameter.params.profiles
    )}`
  );
  return common;
}

async function logEvolutions(
  common: FutureCommon | SpotCommon,
  crypto: string
) {
  const profits: number[] = [];
  const data: JSONArray = await common.getHistoryPositions(crypto);
  data.forEach((pos: JSONObject) => {
    profits.push(parseFloat(pos.netProfit as string));
  });
  let somme = 0;
  const increm = profits.map((numero) => (somme += numero));
  logChart(increm);
}

export { runner };
