/* eslint-disable @typescript-eslint/no-unused-vars */
import { Common, CommonUtils } from "../../common/Account";
import { MixHoldSideEnum, JSONObject, JSONArray, Group } from "../../common/MapperType";

export class FutureInvestorCommon extends CommonUtils implements Common {

    getCurrentPosition(symbol: string, mixHoldSideEnum: MixHoldSideEnum): Promise<JSONObject> {
        throw new Error("Method not implemented.");
    }
    getAllPositions(): Promise<JSONArray> {
        throw new Error("Method not implemented.");
    }
    getHistoryPositions(symbol: string): Promise<JSONArray> {
        throw new Error("Method not implemented.");
    }
    getLastOrder(symbol: string, mixHoldSideEnum: MixHoldSideEnum): Promise<JSONObject> {
        throw new Error("Method not implemented.");
    }
    getCurrentPrice(symbol: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getQtyToInvest(symbol: string, currentPrice: number, mixHoldSideEnum: MixHoldSideEnum): Promise<number> {
        throw new Error("Method not implemented.");
    }

    
    setGroup(group: Group): void {
        this.group = group;
    }
    getGroup(): Group {
        return this.group;
    }


  
}
