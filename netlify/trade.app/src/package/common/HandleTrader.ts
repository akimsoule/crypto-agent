import { Config } from "./Config";
import { TradeParam } from "./MapperType";
import { Account } from "./Account";
import { FilterSignal, FilterProd, FilterRoi, Filter } from "../filter/Filter";
import { Util } from "./Util";
import { FutureInvestorAccount } from "../future/investor/FutureInvestorAccount";

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
      // Sécurisation: certains comptes investisseurs peuvent ne pas avoir encore un objet filter initialisé.
  const accountGroup = (this.account as unknown as { group?: { filter?: unknown } }).group;
  const groupFilter = accountGroup?.filter as { filters?: { filters?: Filter[] } } | undefined;
      if (!groupFilter || !groupFilter.filters) {
        // Pas de structure de filtre -> on skip la stratégie pour éviter crash.
        return;
      }
      const filterRoot = groupFilter.filters; // AndFilter / OrFilter
      const filters: Filter[] = [];
      if (filterRoot?.filters) {
        Util.findAllFilters(filterRoot.filters, filters);
      }

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
      const isProd = this.config.botParameter.isProdEnv();
      const isDev = this.config.botParameter.isDevEnv();
      const isInvestorDev = isDev && this.account instanceof FutureInvestorAccount;
      const isRealProd = isProd && !(this.account instanceof FutureInvestorAccount);
      // On exécute l'entrée/sortie soit pour le trading réel en prod, soit pour les investisseurs fictifs en dev.
      const canExecute = isInvestorDev || isRealProd;

      if (!canExecute) return; // Pas de trading dans ce contexte

      if (this.account.group.filter.mustEnter(tradeParam)) {
        const price = asset.closings[index];
        const ok = await this.account.entry(
          symbol,
          price,
          mixHoldSideEnum
        );
        // Persistance uniquement pour investisseurs fictifs en DEV
        if (isInvestorDev) {
          // @ts-expect-error dynamic method
            if (this.afterTradePersist) {
              // @ts-expect-error dynamic method
              await this.afterTradePersist("ENTRY", ok, tradeParam, price);
            }
        }
      } else if (this.account.group.filter.mustExit(tradeParam)) {
        const price = asset.closings[index];
        await this.account.exitAllCopyIfPL(
          symbol,
          price,
          mixHoldSideEnum
        );

        if (filterRoi) {
          if (filterRoi.mustExit(tradeParam)) {
            const ok1 = await this.account.exitAllCopy(
              symbol,
              price,
              mixHoldSideEnum
            );
            const ok2 = await this.account.exitIfPL(
              symbol,
              price,
              mixHoldSideEnum
            );
            if (isInvestorDev) {
              // @ts-expect-error dynamic method
              if (this.afterTradePersist) {
                // @ts-expect-error dynamic method
                await this.afterTradePersist(
                  "EXIT",
                  ok1 || ok2,
                  tradeParam,
                  price
                );
              }
            }
          }
        } else {
          const ok = await this.account.exit(symbol, price, mixHoldSideEnum);
          if (isInvestorDev) {
            // @ts-expect-error dynamic method
            if (this.afterTradePersist) {
              // @ts-expect-error dynamic method
              await this.afterTradePersist("EXIT", ok, tradeParam, price);
            }
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

// afterTradePersist: méthode potentiellement fournie par sous-classe (Trader)

export { HandleTrader };
