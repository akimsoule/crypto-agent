export enum Action {
    SELL = -1,
    HOLD = 0,
    BUY = 1
}

export interface Asset {
    dates: Date[];
    openings: number[];
    closings: number[];
    highs: number[];
    lows: number[];
    volumes: number[];
}