import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { Config } from "../package/common/Config";
import {
  CandlestickIntervalEnum,
  FutureGroup,
  MixHoldSideEnum,
  MixMarginModeEnum,
  Params,
  Profile,
  SpotGroup,
} from "../package/common/MapperType";
import { BackTest } from "../package/config/backtest";
import { BacktestMetric } from "../package/config/backtest/BacktestMetric";
import { DevFilter } from "../package/filter/Filter";
import { FutureCandle } from "../package/future/FutureCandle";
import { FutureCommon } from "../package/future/FutureCommon";
import {
  getStrategies,
  Strategy,
  tripleEmaStrategy,
} from "../package/strategy";
import { Action, Asset } from "../types/lib";

dotenv.config();

const prisma = new PrismaClient();
const backTests = new BackTest();
let LTCMarketTreshold;
let BTCMarketTreshold;
// LTCMarketTreshold = 17000000;
// BTCMarketTreshold = 1000000000;
const marketTreshold = LTCMarketTreshold ?? BTCMarketTreshold;

// Fonction pour diviser un tableau en sous-groupes de taille `size`
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const saveBacktestsToDB = async (metrics: BacktestMetric[]) => {
  for (const metric of metrics) {
    await prisma.backtestMetric.upsert({
      where: {
        name: metric.name,
      },
      update: {
        mixHoldSideEnum: metric.mixHoldSideEnum,
        openTrades: metric.openTrades,
        closeTrades: metric.closeTrades,
        winningTrades: metric.winningTrades,
        losingTrades: metric.losingTrades,
        profitLoss: metric.profitLoss,
        maxDrawdown: metric.maxDrawdown,
        peak: metric.peak,
        successRate: metric.successRate,
        maxPositionSize: metric.maxPositionSize,
        performanceRatio: metric.performanceRatio,
        image: Buffer.from(metric.image.toString("base64"), "base64"),
      },
      create: {
        name: metric.name,
        mixHoldSideEnum: metric.mixHoldSideEnum,
        openTrades: metric.openTrades,
        closeTrades: metric.closeTrades,
        winningTrades: metric.winningTrades,
        losingTrades: metric.losingTrades,
        profitLoss: metric.profitLoss,
        maxDrawdown: metric.maxDrawdown,
        peak: metric.peak,
        successRate: metric.successRate,
        maxPositionSize: metric.maxPositionSize,
        performanceRatio: metric.performanceRatio,
        image: Buffer.from(metric.image.toString("base64"), "base64"),
      },
    });
  }
  console.log("Backtests successfully saved to SQLite!");
};

const mergeSortedResults = (
  profitArray: BacktestMetric[],
  perfArray: BacktestMetric[]
): BacktestMetric[] => {
  const uniqueMap = new Map<string, BacktestMetric>();

  // Add items from sortedByProfit first
  profitArray.forEach((item) => {
    uniqueMap.set(item.name, item);
  });

  // Add items from sortedByPerf, only if they don't exist
  perfArray.forEach((item) => {
    if (!uniqueMap.has(item.name)) {
      uniqueMap.set(item.name, item);
    }
  });

  // Convert map back to array
  return Array.from(uniqueMap.values());
};

const deleteDb = async () => {
  await prisma.backtestMetric.deleteMany({
    where: {
      OR: [
        { mixHoldSideEnum: MixHoldSideEnum.LONG },
        { mixHoldSideEnum: MixHoldSideEnum.SHORT },
      ],
    },
  });
};

const saveInDB = async () => {
  const sortedByPerf = Array.from(backTests.map.values())
    .sort(
      (a, b) => b.calculatePerformanceRatio() - a.calculatePerformanceRatio()
    )
    .filter(
      (backTestMetric) =>
        backTestMetric.performanceRatio > 5 && backTestMetric.profitLoss > 10
    )
    .slice(0, 10);
  console.log("Backtest results sorted by profit/loss:");
  const results = mergeSortedResults(sortedByPerf, []);
  results.forEach((metric) => {
    console.log(metric.toString());
  });

  await saveBacktestsToDB(results);
  backTests.map.clear();

  console.log("Backtest completed!");
};

const simulateTrading = (
  symbol: string,
  asset: Asset,
  type: string,
  strategy: { name: string; strategy: Strategy }
) => {
  const strategyResult = strategy.strategy as Strategy;
  const keyNameLong = backTests.generateName(
    symbol,
    type,
    MixHoldSideEnum.LONG
  );
  const keyNameShort = backTests.generateName(
    symbol,
    type,
    MixHoldSideEnum.SHORT
  );
  backTests.createNewMetricByName(asset, keyNameLong, MixHoldSideEnum.LONG);
  backTests.createNewMetricByName(asset, keyNameShort, MixHoldSideEnum.SHORT);
  const longMetric = backTests.getBacktestMetric(
    asset,
    keyNameLong,
    MixHoldSideEnum.LONG
  );
  const shortMetric = backTests.getBacktestMetric(
    asset,
    keyNameShort,
    MixHoldSideEnum.SHORT
  );

  for (let index = 0; index < strategyResult.length; index++) {
    const currentPrice = asset.closings[index];

    if (strategyResult.longStrategy[index] === Action.BUY) {
      longMetric.openPosition(index, currentPrice, 100, MixHoldSideEnum.LONG); // Montant fictif
    } else if (strategyResult.longStrategy[index] === Action.SELL) {
      longMetric.closePosition(index, currentPrice);
    }

    if (strategyResult.shortStrategy[index] === Action.BUY) {
      shortMetric.openPosition(index, currentPrice, 100, MixHoldSideEnum.SHORT); // Montant fictif
    } else if (strategyResult.shortStrategy[index] === Action.SELL) {
      shortMetric.closePosition(index, currentPrice);
    }
  }

  backTests.updateBacktestMetricByName(keyNameLong, longMetric);
  backTests.updateBacktestMetricByName(keyNameShort, shortMetric);
};

const main = async () => {
  await deleteDb();
  const params: Params = {
    futureParam: {
      groups: [
        {
          period: CandlestickIntervalEnum.HOURLY,
          indicator: { type: "DOUBLE_AVG" },
          exit: false,
          position: MixHoldSideEnum.LONG,
          activeLimit: false,
          filter: new DevFilter(),
          margeLeverage: 5,
          marginMode: MixMarginModeEnum.CROSSED,
          symbols: ["BTC"],
        } as FutureGroup,
      ] as FutureGroup[],
    },
    spotParam: { groups: [] as SpotGroup[] },
    profiles: [Profile.FUTURE, Profile.DEV],
  };

  const config = new Config(params);
  const futureCandle = new FutureCandle(config);
  const futureCommon = new FutureCommon(config);
  const groups = params.futureParam.groups;

  for (const group of groups) {
    const symbMarketCaps = (await futureCommon.getAllSymbolsInFuture()).filter(
      (symbMark) => symbMark.symbol === "XRP"
    );
    const symbMarketBatches = chunkArray(symbMarketCaps, 10);

    for (const batch of symbMarketBatches) {
      console.log(
        `Processing symbols: ${batch
          .map((symbMark) => symbMark.symbol)
          .join(", ")}`
      );
      for (const symbolMarketCap of batch) {
        const coinmarketcap = symbolMarketCap.circulatingSupply;
        if (marketTreshold && coinmarketcap < marketTreshold) {
          console.warn(
            `Market cap below 1 billion for ${symbolMarketCap.symbol}`
          );
          continue;
        }
        console.log(`Fetching data for ${symbolMarketCap.symbol}...`);
        try {
          const asset = (await futureCandle.getAsset(
            symbolMarketCap.symbol,
            group.period,
            new Date(),
            1000
          )) as Asset;

          if (asset && asset.closings.length > 0) {
            // let strategies = [
            //   { name: "ADAPTIVE", strategy: getStrategy(asset, "ADAPTIVE") },
            // {
            //   name: "env_macd",
            //   strategy: andEntryExitStrategy(asset, envStrategy(asset), macdRsiStrategy(asset)),
            // },
            // ];
            const strategies = [
              ...getStrategies(asset),
              // {
              //   name: "macd_env",
              //   strategy: orStrategy(asset, [
              //     macdStrategy(asset),
              //     envStrategy(asset),
              //   ]),
              // },
              {
                name: "ema",
                strategy: tripleEmaStrategy(asset, 5, 10, 50),
              },
            ];
            // .filter(strategy => strategy.name === "macd" || strategy.name === "env")
            for (const strategy of strategies) {
              simulateTrading(
                symbolMarketCap.symbol,
                asset,
                strategy.name,
                strategy
              );
            }
          } else {
            console.warn(
              `No closing data available for ${symbolMarketCap.symbol}`
            );
          }
        } catch (error) {
          console.error(
            `Error fetching data for ${symbolMarketCap.symbol}:`,
            error
          );
        }
      }
      await saveInDB();
    }
  }
};

main()
  .then(() => {
    console.log("done");
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
