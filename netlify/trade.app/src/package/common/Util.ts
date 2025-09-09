import { Filter, AndFilter, OrFilter } from "../filter/Filter";
import { CandlestickIntervalEnum, JSONObject } from "./MapperType";

class Util {
  private static CACHE = new Map<string, unknown>();
  private static timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  static convertUsdtToCrypto(
    usdtQty: number,
    currentCryptoPrice: number
  ): number {
    return usdtQty / currentCryptoPrice;
  }

  static convertCryptoToUsdt(
    cryptoQty: number,
    currentCryptoPrice: number
  ): number {
    return cryptoQty * currentCryptoPrice;
  }

  static getUnitPip(value: number): number {
    let formatPrice: string = String(value);
    formatPrice = formatPrice.replace("\\d", "0");
    formatPrice = formatPrice.substring(0, formatPrice.length - 1) + "1";
    return parseFloat(formatPrice);
  }

  static isBeforeAPeriod(lastOrder: JSONObject, previousDate: Date): boolean {
    const orderDate = Util.getLocalDateTimeOfLastOrder(lastOrder);
    const isBefore = orderDate.getTime() < previousDate.getTime();
    return isBefore;
  }

  static getDuration(period: CandlestickIntervalEnum): number {
    let duration: number;
    switch (period) {
      case CandlestickIntervalEnum.ONE_MINUTE:
        duration = 1 * 60000;
        break;
      case CandlestickIntervalEnum.FIVE_MINUTES:
        duration = 5 * 60000;
        break;
      case CandlestickIntervalEnum.FIFTEEN_MINUTES:
        duration = 15 * 60000;
        break;
      case CandlestickIntervalEnum.HALF_HOURLY:
        duration = 30 * 60000;
        break;
      case CandlestickIntervalEnum.HOURLY:
        duration = 60 * 60000;
        break;
      case CandlestickIntervalEnum.TWO_HOURLY:
        duration = 2 * 60 * 60000;
        break;
      case CandlestickIntervalEnum.FOUR_HOURLY:
        duration = 4 * 60 * 60000;
        break;
      case CandlestickIntervalEnum.SIX_HOURLY:
        duration = 6 * 60 * 60000;
        break;
      case CandlestickIntervalEnum.TWELVE_HOURLY:
        duration = 12 * 60 * 60000;
        break;
      case CandlestickIntervalEnum.DAILY:
        duration = 24 * 60 * 60000;
        break;
      case CandlestickIntervalEnum.WEEKLY:
        duration = 7 * 24 * 60 * 60000;
        break;
      case CandlestickIntervalEnum.MONTHLY:
        duration = 31 * 24 * 60 * 60000;
        break;
      default:
        throw new Error("Unexpected value: " + period.futureIntervalId);
    }

    return duration;
  }

  static getLocalDateTimeOfLastOrder(lastOrder: JSONObject): Date {
    if (lastOrder && lastOrder.cTime) {
      return this.intToLocalDateTime(lastOrder.cTime as number);
    } else {
      return new Date(1960, 1, 1, 0, 0, 0, 0);
    }
  }

  static readonly intToLocalDateTime = (millisecond: number): Date => {
    return new Date(parseInt(millisecond.toString()));
  };

  static readonly dateToString = (date: Date): string => {
    const converted = date.toLocaleString("fr-FR", {
      timeZone: this.timeZone,
    });
    return converted;
  };

  static findAllFilters(filters: Filter[], init: Filter[]) {
    for (const filter of filters) {
      if (filter instanceof AndFilter || filter instanceof OrFilter) {
        Util.findAllFilters(filter.filters, init);
      } else {
        init.push(filter);
      }
    }
  }

  static fix(value: number, price: number) {
    return this.roundToDecimal(value, this.countDecimals(price));
  }

  static countDecimals(num: number) {
    if (!isNaN(num)) {
      const decimalPart = String(num).split(".")[1];
      return decimalPart ? decimalPart.length : 0;
    }
    return NaN;
  }

  static roundToDecimal(num: number, decimals: number) {
    if (isNaN(num) || isNaN(decimals)) {
      return NaN;
    }
    return Number(num.toFixed(decimals));
  }
}

export { Util };
