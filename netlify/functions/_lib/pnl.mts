// Utilitaires partagés pour reconstruction des positions ouvertes et calcul de PnL
import { SecondaryAccountConfig } from "../../trade.app/src/package/common/Config";
import { FutureInvestorCandle } from "../../trade.app/src/package/future/investor/FutureInvestorCandle";
import {
  CandlestickIntervalEnum,
  MixHoldSideEnum,
} from "../../trade.app/src/package/common/MapperType";

export type OrderLite = {
  symbol: string;
  baseVolume: unknown;
  priceAvg: unknown;
  side?: string | null;
  posSide?: string | null;
  createdAt: Date;
};

export type State = {
  qty: number;
  avg: number;
  base: string;
  side: "long" | "short";
};

export type PositionDetail = {
  base: string;
  symbol: string;
  side: "long" | "short";
  qty: number;
  avg: number;
  price: number; // mark price utilisé
  unrealized: number;
};

export const baseFromSymbol = (sym: string) =>
  sym.replace(/S?USDT$/i, "").toUpperCase();

export function toNum(v: unknown, def = 0): number {
  if (v === null || v === undefined) return def;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : def;
}

// Alias pour limiter la complexité des unions répétées
export type OnlySide = "long" | "short" | MixHoldSideEnum;

function wantSide(onlySide?: OnlySide): "long" | "short" | undefined {
  if (!onlySide) return undefined;
  const s = (typeof onlySide === "string" ? onlySide : String(onlySide)).toLowerCase();
  return s === "long" || s === "short" ? (s as "long" | "short") : undefined;
}

type ParsedOrder = {
  base: string;
  pos: "long" | "short";
  side: "buy" | "sell";
  qty: number;
  price: number;
};

function parseOrder(o: OrderLite): ParsedOrder | null {
  const base = baseFromSymbol(o.symbol);
  const posRaw = String(o.posSide || "").toLowerCase();
  const sideRaw = String(o.side || "").toLowerCase();
  const pos = posRaw === "long" || posRaw === "short" ? (posRaw as "long" | "short") : null;
  const side = sideRaw === "buy" || sideRaw === "sell" ? (sideRaw as "buy" | "sell") : null;
  const qty = toNum(o.baseVolume);
  const price = toNum(o.priceAvg);
  if (!pos || !side) return null;
  if (qty <= 0 || price <= 0) return null;
  return { base, pos, side, qty, price };
}

function applyTrade(st: State, ord: ParsedOrder): void {
  const { pos, side, qty, price } = ord;
  const isIncrease = (pos === "long" && side === "buy") || (pos === "short" && side === "sell");
  if (isIncrease) {
    const newQty = st.qty + qty;
    st.avg = st.qty > 0 ? (st.avg * st.qty + price * qty) / newQty : price;
    st.qty = newQty;
    return;
  }
  // decrease position size
  st.qty = Math.max(0, st.qty - qty);
  if (st.qty === 0) st.avg = 0;
}

export function reconstructStates(
  orders: OrderLite[],
  opts?: { onlySide?: OnlySide }
): Map<string, State> {
  const states = new Map<string, State>(); // key = base:side
  const asc = orders
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const want = wantSide(opts?.onlySide);
  for (const o of asc) {
    const parsed = parseOrder(o);
    if (!parsed) continue;
    if (want && parsed.pos !== want) continue;
    const key = `${parsed.base}:${parsed.pos}`;
    const st = states.get(key) ?? { qty: 0, avg: 0, base: parsed.base, side: parsed.pos };
    applyTrade(st, parsed);
    states.set(key, st);
  }
  return states;
}

let CANDLE_SINGLETON: FutureInvestorCandle | null = null;
function getCandle(): FutureInvestorCandle {
  if (CANDLE_SINGLETON) return CANDLE_SINGLETON;
  const cfg = SecondaryAccountConfig.SECOND_DEFAULT_CONFIG();
  CANDLE_SINGLETON = new FutureInvestorCandle(cfg);
  return CANDLE_SINGLETON;
}

// Cache léger en mémoire pour limiter les appels multiples au mark price
const PRICE_CACHE = new Map<string, { price: number; at: number }>(); // key = BASE

export async function getPriceMap(
  bases: string[],
  opts?: { ttlMs?: number }
): Promise<Map<string, number>> {
  const uniq = Array.from(new Set(bases.map((b) => b.toUpperCase())));
  const result = new Map<string, number>();
  // Si aucune clé API n'est configurée pour le second compte, on renvoie une map vide
  // afin d'éviter des erreurs réseau ou throttling inutile côté build / dev.
  const hasApi = !!process.env.ACCOUNT_API_KEY_SECOND && !!process.env.ACCOUNT_SECRET_KEY_SECOND;
  const candle = hasApi ? getCandle() : null;
  const ttlMs = Math.max(0, opts?.ttlMs ?? 15_000);

  const toFetch: string[] = [];
  const now = Date.now();

  for (const b of uniq) {
    const cached = PRICE_CACHE.get(b);
    if (cached && now - cached.at <= ttlMs && cached.price > 0) {
      result.set(b, cached.price);
    } else {
      toFetch.push(b);
    }
  }

  if (hasApi && candle) {
    await Promise.all(
      toFetch.map(async (b) => {
        const symbol = b; // base simple
        try {
          const candles = await candle.getCandles(
            symbol,
            CandlestickIntervalEnum.HOURLY,
            new Date(),
            1
          );
          if (candles && candles.length) {
            const last = candles[candles.length - 1];
            const px = toNum(last.close);
            if (px > 0) {
              result.set(b, px);
              PRICE_CACHE.set(b, { price: px, at: Date.now() });
            }
          }
        } catch {
          // ignore: absence de prix => on utilisera avg plus tard
        }
      })
    );
  }

  return result;
}

export function computeUnrealized(
  states: Map<string, State>,
  priceMap: Map<string, number>,
  opts?: { onlySide?: OnlySide }
): {
  totalUnrealized: number;
  activePositions: number;
} {
  let totalUnrealized = 0;
  let activePositions = 0;
  for (const st of states.values()) {
    if (opts?.onlySide) {
      const want =
        typeof opts.onlySide === "string"
          ? opts.onlySide.toLowerCase()
          : String(opts.onlySide).toLowerCase();
      if (st.side !== (want as "long" | "short")) continue;
    }
    if (st.qty <= 0 || st.avg <= 0) continue;
    const px = priceMap.get(st.base) ?? st.avg;
    const pnl =
      st.side === "long" ? (px - st.avg) * st.qty : (st.avg - px) * st.qty;
    totalUnrealized += pnl;
    activePositions += 1;
  }
  return { totalUnrealized, activePositions };
}

export function buildPositionsDetail(
  states: Map<string, State>,
  priceMap: Map<string, number>,
  opts?: { onlySide?: OnlySide }
): PositionDetail[] {
  const details: PositionDetail[] = [];
  for (const st of states.values()) {
    if (opts?.onlySide) {
      const want =
        typeof opts.onlySide === "string"
          ? opts.onlySide.toLowerCase()
          : String(opts.onlySide).toLowerCase();
      if (st.side !== (want as "long" | "short")) continue;
    }
    if (st.qty <= 0 || st.avg <= 0) continue;
    const price = priceMap.get(st.base) ?? st.avg;
    const unrealized =
      st.side === "long"
        ? (price - st.avg) * st.qty
        : (st.avg - price) * st.qty;
    details.push({
      base: st.base,
      symbol: `${st.base}USDT`,
      side: st.side,
      qty: st.qty,
      avg: st.avg,
      price,
      unrealized,
    });
  }
  // Trier par PnL décroissant pour lisibilité
  details.sort(
    (a, b) =>
      Math.sign(Math.abs(b.unrealized) - Math.abs(a.unrealized)) ||
      Math.sign(b.unrealized - a.unrealized)
  );
  return details;
}
