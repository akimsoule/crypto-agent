import { Copy } from "../common/Account";
import { MixHoldSideEnum, JSONObject } from "../common/MapperType";
import { SpotPlan } from "./SpotPlan";

class SpotCopy extends SpotPlan implements Copy {
  exitAllCopyIfPL(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean> {
    console.log("Exit all copy if PL", { symbol, currentPrice, mixHoldSideEnum });
    throw new Error("Method not implemented.");
  }
  exitAllCopy(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum
  ): Promise<boolean> {
    console.log("Exit all copy", { symbol, currentPrice, mixHoldSideEnum });
    throw new Error("Method not implemented.");
  }
  exitCopy(
    symbol: string,
    currentPrice: number,
    mixHoldSideEnum: MixHoldSideEnum,
    posObj: JSONObject
  ): Promise<boolean> {
    console.log("Exit copy", { symbol, currentPrice, mixHoldSideEnum, posObj });
    throw new Error("Method not implemented.");
  }
}

export { SpotCopy };
