/* eslint-disable @typescript-eslint/no-unused-vars */
import { Market } from "../../common/Account";
import { MixHoldSideEnum } from "../../common/MapperType";
import { FutureInvestorCommon } from "./FutureInvestorCommon";

export class FutureInvestorMarket extends FutureInvestorCommon implements Market {
    
    entry(symbol: string, currentPrice: number, mixHoldSideEnum: MixHoldSideEnum): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    exit(symbol: string, currentPrice: number, mixHoldSideEnum: MixHoldSideEnum): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    exitIfPL(symbol: string, currentPrice: number, mixHoldSideEnum: MixHoldSideEnum): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
   
}
