import {
  JSONObject,
  MixHoldSideEnum,
  OrderSideEnum,
  TradeParam,
} from "../common/MapperType";
import { Util } from "../common/Util";
import { Action } from "../../types/lib";
import { Label } from "../common/Label";

interface Filter {
  mustEnter(tradeParam: TradeParam): boolean;
  mustExit(tradeParam: TradeParam): boolean;
}

abstract class BaseFilter implements Filter {
  abstract mustEnter(tradeParam: TradeParam): boolean;
  abstract mustExit(tradeParam: TradeParam): boolean;
}

class FilterSignal extends BaseFilter {
  mustEnter(tradeParam: TradeParam): boolean {
    return tradeParam.action === Action.BUY;
  }

  mustExit(tradeParam: TradeParam): boolean {
    return tradeParam.action === Action.SELL;
  }
}

class FilterProd extends BaseFilter {
  mustEnter(params: TradeParam): boolean {
    return this.mustTradeInProd(params);
  }

  mustExit(params: TradeParam): boolean {
    return this.mustTradeInProd(params);
  }

  private mustTradeInProd(params: TradeParam): boolean {
    const { index, lastOrder, asset, closings, botParameter } = params;
    return (
      index === closings.length - 1 &&
      botParameter.isProdEnv() &&
      Util.isBeforeAPeriod(lastOrder, asset.dates[index - 2])
    );
  }
}

class FilterRoi extends BaseFilter {
  public lowThreshold = -25;
  public upThreshold = 5;
  public takeProfitThreshold = 10;

  constructor(lowThreshold = -25, upThreshold = 5, takeProfitThreshold = 10) {
    super();
    this.lowThreshold = lowThreshold;
    this.upThreshold = upThreshold;
    this.takeProfitThreshold = takeProfitThreshold;
  }

  mustEnter(tradeParam: TradeParam): boolean {
    if (tradeParam.group.exit) {
      return this.isLoosing(tradeParam.position, tradeParam.currentPrice);
    }
    return this.isNotOpenedOrIsOpenedAndIsLoosing(
      tradeParam.position,
      tradeParam.currentPrice
    );
  }

  mustExit(tradeParam: TradeParam): boolean {
    return (
      // this.isWinning(tradeParam.position, tradeParam.currentPrice) ||
      this.hasReachedTakeProfit(tradeParam.position, tradeParam.currentPrice)
    );
  }

  public isLoosing(position: JSONObject, currentPrice: number): boolean {
    return this.getReturnOnEquity(position, currentPrice) < this.lowThreshold;
  }

  public hasReachedTakeProfit(
    position: JSONObject,
    currentPrice: number
  ): boolean {
    return (
      this.getReturnOnEquity(position, currentPrice) >= this.takeProfitThreshold
    );
  }

  public isWinning(position: JSONObject, currentPrice: number): boolean {
    return this.getReturnOnEquity(position, currentPrice) > this.upThreshold;
  }

  public getReturnOnEquity(position: JSONObject, currentPrice: number): number {
    if (!position || Object.keys(position).length === 0) {
      return 0;
    }
    if (Label.UNREALIZED_PL in position) {
      const unrealizedPl = position[Label.UNREALIZED_PL] as number;
      const margin = this.getMarginFromPosition(position);
      return (unrealizedPl * 100) / margin;
    }

    const mixHoldSideEnum = this.getMixHoldSideEnumFromPosition(position);
    const leverage = this.getLeverageFromPosition(position);
    const openSize = this.getOpenSizeFromPosition(position);
    const openPrice = this.getOpenPriceFromPosition(position);

    if (leverage !== 0 && openSize !== 0 && openPrice !== 0) {
      const initialAssetInUsdt = Util.convertCryptoToUsdt(openSize, openPrice);
      const currentAssetInUsdt = Util.convertCryptoToUsdt(
        openSize,
        currentPrice
      );
      const marge = currentAssetInUsdt / leverage;
      const pl =
        mixHoldSideEnum === MixHoldSideEnum.SHORT
          ? initialAssetInUsdt - currentAssetInUsdt
          : currentAssetInUsdt - initialAssetInUsdt;
      return (pl * 100) / marge;
    }
    return 0;
  }

  public isNotOpenedOrIsOpenedAndIsLoosing(
    position: JSONObject,
    currentPrice: number
  ): boolean {
    return !this.isOpened(position) || this.isLoosing(position, currentPrice);
  }

  public getOpenPriceFromPosition(position: JSONObject): number {
    return (
      (position[Label.AVERAGE_OPEN_PRICE] as number) ||
      (position[Label.OPEN_PRICE_AVG] as number) ||
      (position[Label.PRICE_AVG] as number) ||
      0
    );
  }

  public getOpenSizeFromPosition(position: JSONObject): number {
    return (
      (position[Label.AVAILABLE] as number) ||
      (position[Label.SIZE] as number) ||
      (position[Label.FIXED_MAX_AVAILABLE] as number) ||
      (position[Label.OPEN_SIZE] as number) ||
      0
    );
  }

  public getLeverageFromPosition(position: JSONObject): number {
    return (
      (position[Label.OPEN_LEVERAGE] as number) ||
      (position[Label.LEVERAGE] as number) ||
      0
    );
  }

  public getMixHoldSideEnumFromPosition(position: JSONObject): MixHoldSideEnum {
    return (
      (position[Label.POS_SIDE] as string) ||
      (position[Label.HOLD_SIDE] as string) ||
      MixHoldSideEnum.LONG
    ).toLowerCase() as MixHoldSideEnum;
  }

  public isOpened(position: JSONObject): boolean {
    return this.getOpenPriceFromPosition(position) !== 0;
  }

  public getMarginFromPosition(position: JSONObject): number {
    return (
      (position[Label.MARGIN] as number) ||
      (position[Label.MARGIN_SIZE] as number) ||
      1
    );
  }
}

class FilterRoiParams extends FilterRoi {
  constructor(lowThreshold: number, upThreshold: number) {
    super();
    this.lowThreshold = lowThreshold;
    this.upThreshold = upThreshold;
  }
}

class FilterRoiExit extends BaseFilter {
  private filter: Filter = new FilterRoi();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mustEnter(tradeParam: TradeParam): boolean {
    return false;
  }

  mustExit(tradeParam: TradeParam): boolean {
    const { lastOrder } = tradeParam;
    const uTime = lastOrder.uTime as number;
    const lastDate = new Date(
      new Date(uTime).toLocaleString("en-US", { timeZone: "America/Toronto" })
    );
    const currentDate = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Toronto" })
    );
    const threeDaysAgo = new Date(currentDate);
    threeDaysAgo.setDate(currentDate.getDate() - 3);
    return lastDate < threeDaysAgo && this.filter.mustExit(tradeParam);
  }
}

class FilterBinary extends BaseFilter {
  mustEnter(tradeParam: TradeParam): boolean {
    const { lastOrder } = tradeParam;
    return (
      Object.keys(lastOrder).length === 0 ||
      (Label.SIDE in lastOrder && lastOrder[Label.SIDE] === OrderSideEnum.SELL)
    );
  }

  mustExit(tradeParam: TradeParam): boolean {
    const { lastOrder } = tradeParam;
    return (
      Label.SIDE in lastOrder && lastOrder[Label.SIDE] === OrderSideEnum.BUY
    );
  }
}

class FilterPositionNotFar extends BaseFilter {
  private filterRoi: FilterRoi = new FilterRoi();

  mustEnter(tradeParam: TradeParam): boolean {
    if (tradeParam.group.exit) {
      return this.filterRoi.isLoosing(
        tradeParam.position,
        tradeParam.currentPrice
      );
    }
    return (
      this.filterRoi.isNotOpenedOrIsOpenedAndIsLoosing(
        tradeParam.position,
        tradeParam.currentPrice
      ) &&
      !this.filterRoi.isLoosing(
        tradeParam.positionCompl,
        tradeParam.currentPrice
      )
    );
  }

  mustExit(tradeParam: TradeParam): boolean {
    return this.filterRoi.mustExit(tradeParam);
  }
}

class CompositeFilter extends BaseFilter {
  public filters: Filter[];

  constructor(filters: Filter[]) {
    super();
    this.filters = filters;
  }

  mustEnter(tradeParam: TradeParam): boolean {
    return this.filters.every((filter) => filter.mustEnter(tradeParam));
  }

  mustExit(tradeParam: TradeParam): boolean {
    return this.filters.every((filter) => filter.mustExit(tradeParam));
  }
}

class AndFilter extends CompositeFilter {}

class OrFilter extends CompositeFilter {
  mustEnter(tradeParam: TradeParam): boolean {
    return this.filters.some((filter) => filter.mustEnter(tradeParam));
  }

  mustExit(tradeParam: TradeParam): boolean {
    return this.filters.some((filter) => filter.mustExit(tradeParam));
  }
}

class StandardFilter extends BaseFilter {
  public filters: AndFilter;

  constructor() {
    super();
    this.filters = new AndFilter([
      new FilterSignal(),
      new FilterProd(),
      new FilterRoi(),
      new FilterPositionNotFar(),
    ]);
  }

  mustEnter(tradeParam: TradeParam): boolean {
    return this.filters.mustEnter(tradeParam);
  }

  mustExit(tradeParam: TradeParam): boolean {
    return this.filters.mustExit(tradeParam);
  }
}

class PureFilter extends BaseFilter {
  public filters: AndFilter;

  constructor() {
    super();
    this.filters = new AndFilter([new FilterSignal(), new FilterProd()]);
  }

  mustEnter(tradeParam: TradeParam): boolean {
    return this.filters.mustEnter(tradeParam);
  }

  mustExit(tradeParam: TradeParam): boolean {
    return this.filters.mustExit(tradeParam);
  }
}

class StandardFilterWithoutRoi extends BaseFilter {
  public filters: AndFilter;

  constructor() {
    super();
    this.filters = new AndFilter([
      new FilterSignal(),
      new FilterProd(),
      new FilterPositionNotFar(),
    ]);
  }

  mustEnter(tradeParam: TradeParam): boolean {
    return this.filters.mustEnter(tradeParam);
  }

  mustExit(tradeParam: TradeParam): boolean {
    return this.filters.mustExit(tradeParam);
  }
}

class StandardFilterWithoutNotFar extends BaseFilter {
  public filters: AndFilter;

  constructor() {
    super();
    this.filters = new AndFilter([
      new FilterSignal(),
      new FilterProd(),
      new FilterRoi(),
    ]);
  }

  mustEnter(tradeParam: TradeParam): boolean {
    return this.filters.mustEnter(tradeParam);
  }

  mustExit(tradeParam: TradeParam): boolean {
    return this.filters.mustExit(tradeParam);
  }
}

class QuickExitFilter extends BaseFilter {
  public filters: OrFilter;

  constructor() {
    super();
    this.filters = new OrFilter([
      new AndFilter([new FilterSignal(), new FilterProd(), new FilterRoi()]),
      new FilterRoi(),
    ]);
  }

  mustEnter(tradeParam: TradeParam): boolean {
    return this.filters.mustEnter(tradeParam);
  }

  mustExit(tradeParam: TradeParam): boolean {
    return this.filters.mustExit(tradeParam);
  }
}

class DevFilter extends BaseFilter {
  public filters: AndFilter;

  constructor() {
    super();
    this.filters = new AndFilter([new FilterSignal(), new FilterRoi()]);
  }

  mustEnter(tradeParam: TradeParam): boolean {
    return this.filters.mustEnter(tradeParam);
  }
  mustExit(tradeParam: TradeParam): boolean {
    return this.filters.mustExit(tradeParam);
  }
}

// Filtres dédiés investisseurs
// - DEV: n’utilise pas FilterProd (autorise les backtests/entrées sur historique), proche de DevFilter
// - PROD: combinaison stricte de filtres non-dev (similaire à StandardFilter)
class InvestorDevFilter extends BaseFilter {
  public filters: AndFilter;

  constructor() {
    super();
    this.filters = new AndFilter([new FilterSignal(), new FilterRoi()]);
  }

  mustEnter(tradeParam: TradeParam): boolean {
    return this.filters.mustEnter(tradeParam);
  }
  mustExit(tradeParam: TradeParam): boolean {
    return this.filters.mustExit(tradeParam);
  }
}

class InvestorProdFilter extends BaseFilter {
  public filters: AndFilter;

  constructor() {
    super();
    this.filters = new AndFilter([
      new FilterSignal(),
      new FilterProd(),
      new FilterRoi(),
      new FilterPositionNotFar(),
    ]);
  }

  mustEnter(tradeParam: TradeParam): boolean {
    return this.filters.mustEnter(tradeParam);
  }
  mustExit(tradeParam: TradeParam): boolean {
    return this.filters.mustExit(tradeParam);
  }
}

// création de plusieurs filtres pour investisseurs en prod
// Trois profils standards: conservateur, équilibré, agressif
class InvestorProdFilterConservative extends BaseFilter {
  public filters: AndFilter;
  constructor() {
    super();
    // Seuils plus prudents: drawdown -15%, up +3%, take profit +6%
    const roi = new FilterRoi(-15, 3, 6);
    this.filters = new AndFilter([
      new FilterSignal(),
      new FilterProd(),
      roi,
      new FilterPositionNotFar(),
    ]);
  }
  mustEnter(tp: TradeParam): boolean { return this.filters.mustEnter(tp); }
  mustExit(tp: TradeParam): boolean { return this.filters.mustExit(tp); }
}

class InvestorProdFilterBalanced extends BaseFilter {
  public filters: AndFilter;
  constructor() {
    super();
    // Valeurs par défaut: drawdown -25%, up +5%, take profit +10%
    const roi = new FilterRoi(-25, 5, 10);
    this.filters = new AndFilter([
      new FilterSignal(),
      new FilterProd(),
      roi,
      new FilterPositionNotFar(),
    ]);
  }
  mustEnter(tp: TradeParam): boolean { return this.filters.mustEnter(tp); }
  mustExit(tp: TradeParam): boolean { return this.filters.mustExit(tp); }
}

class InvestorProdFilterAggressive extends BaseFilter {
  public filters: AndFilter;
  constructor() {
    super();
    // Plus permissif: drawdown -40%, up +8%, take profit +15%
    const roi = new FilterRoi(-40, 8, 15);
    this.filters = new AndFilter([
      new FilterSignal(),
      new FilterProd(),
      roi,
      new FilterPositionNotFar(),
    ]);
  }
  mustEnter(tp: TradeParam): boolean { return this.filters.mustEnter(tp); }
  mustExit(tp: TradeParam): boolean { return this.filters.mustExit(tp); }
}

// Fabrique pratique pour récupérer les presets
export function createInvestorProdFilters() {
  return {
    conservative: new InvestorProdFilterConservative(),
    balanced: new InvestorProdFilterBalanced(),
    aggressive: new InvestorProdFilterAggressive(),
  } as const;
}


export {
  Filter,
  FilterSignal,
  FilterRoi,
  FilterRoiExit,
  FilterProd,
  FilterRoiParams,
  FilterBinary,
  FilterPositionNotFar,
  QuickExitFilter,
  StandardFilter,
  DevFilter,
  PureFilter,
  StandardFilterWithoutRoi,
  StandardFilterWithoutNotFar,
  AndFilter,
  OrFilter,
  InvestorDevFilter,
  InvestorProdFilter,
  InvestorProdFilterConservative,
  InvestorProdFilterBalanced,
  InvestorProdFilterAggressive,
};
