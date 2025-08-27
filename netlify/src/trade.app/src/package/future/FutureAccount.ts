import { Account } from "../common/Account";
import { Group, JSONObject, MixHoldSideEnum } from "../common/MapperType";
import { FilterRoi } from "../filter/Filter";
import { FutureCopy } from "./FutureCopy";

class FutureAccount extends FutureCopy implements Account {
  async init(
    group: Group,
    symbol: string,
    posArray: JSONObject[]
  ): Promise<void> {
    this.setGroup(group);
    await this.setMarginModeWithCache(group, symbol, posArray);
    const filterRoi = new FilterRoi();
    if (filterRoi.isOpened(posArray[0])) {
      await this.setLeverageWithCache(
        group,
        symbol,
        posArray[0],
        MixHoldSideEnum.LONG
      );
    }
    if (filterRoi.isOpened(posArray[1])) {
      await this.setLeverageWithCache(
        group,
        symbol,
        posArray[1],
        MixHoldSideEnum.SHORT
      );
    }
  }
}

export { FutureAccount };
