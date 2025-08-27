import { Config } from "./Config";
import { TradeParam } from "./MapperType";
import { Account } from "./Account";
import { FilterSignal, FilterProd, FilterRoi, Filter } from "../filter/Filter";
import { Util } from "./Util";

class HandleTrader {
  public config: Config;
  public account: Account;

  constructor(config: Config, account: Account) {
    this.config = config;
    this.account = account;
  }

  handleStrategy = async (tradeParam: TradeParam) => {
    if (
      tradeParam.group.position === null ||
      tradeParam.group.position === tradeParam.mixHoldSideEnum.toString()
    ) {
      const filters: Filter[] = [];
      Util.findAllFilters(this.account.group.filter.filters.filters, filters);

      const filterSignal = filters.find(
        (filter) => filter instanceof FilterSignal
      ) as FilterSignal;
      const filterProd = filters.find(
        (filter) => filter instanceof FilterProd
      ) as FilterProd;
      const filterRoi = filters.find(
        (filter) => filter instanceof FilterRoi
      ) as FilterRoi;

      if (
        !filterSignal ||
        (this.config.botParameter.isProdEnv() && !filterProd)
      ) {
        throw new Error(
          `No filter found (filterSignal:${JSON.stringify(
            filterSignal
          )}, filterProd:${JSON.stringify(filterProd)}`
        );
      }

      this.logSignal(tradeParam, filterSignal);
      if (this.config.botParameter.isDebug()) {
        this.logSignal(tradeParam, filterProd);
        this.logSignal(tradeParam, filterRoi);
      }

      const { symbol, asset, index, mixHoldSideEnum } = tradeParam;
      if (this.account.group.filter.mustEnter(tradeParam)) {
        if (this.config.botParameter.isProdEnv()) {
          await this.account.entry(
            symbol,
            asset.closings[index],
            mixHoldSideEnum
          );
        }
      } else if (this.account.group.filter.mustExit(tradeParam)) {
        if (this.config.botParameter.isProdEnv()) {
          await this.account.exitAllCopyIfPL(
            symbol,
            asset.closings[index],
            mixHoldSideEnum
          );

          if (filterRoi) {
            if (filterRoi.mustExit(tradeParam)) {
              await this.account.exitAllCopy(
                symbol,
                asset.closings[index],
                mixHoldSideEnum
              );
              await this.account.exitIfPL(
                symbol,
                asset.closings[index],
                mixHoldSideEnum
              );
            }
          } else {
            await this.account.exit(
              symbol,
              asset.closings[index],
              mixHoldSideEnum
            );
          }
        }
      }
    }
  };

  logSignal = (tradeParam: TradeParam, filter: Filter) => {
    const { symbol, asset, index, mixHoldSideEnum, position, currentPrice } =
      tradeParam;

    if (filter) {
      if (
        !this.config.botParameter.isProdEnv() &&
        this.config.botParameter.isDevEnv()
      ) {
        if (filter.mustEnter(tradeParam)) {
          console.log(
            `${
              filter.constructor.name
            } ${mixHoldSideEnum} Entry, Symbol=${symbol}, Price=${
              asset.closings[index]
            }, date=${Util.dateToString(asset.dates[index])}}`
          );
        } else if (filter.mustExit(tradeParam)) {
          console.log(
            `${
              filter.constructor.name
            } ${mixHoldSideEnum} Exit, Symbol=${symbol}, Price=${
              asset.closings[index]
            }, date=${Util.dateToString(asset.dates[index])}}`
          );
        }

        if (filter instanceof FilterRoi) {
          const roe = filter.getReturnOnEquity(position, currentPrice);
          console.log("Roe: " + roe + "; currentPrice: " + currentPrice);
        }
      }
    }
  };
}

export { HandleTrader };
