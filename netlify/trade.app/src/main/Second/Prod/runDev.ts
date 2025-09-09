import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { SecondaryAccountConfig } from "../../../package/common/Config";
import {
  CandlestickIntervalEnum,
  FutureGroup,
  MixHoldSideEnum,
  MixMarginModeEnum,
  Params,
  Profile,
  SpotGroup,
  IndicatorType,
} from "../../../package/common/MapperType";
import { Runner } from "../../../package/common/Runner";
import {
  StandardFilter,
  StandardFilterWithoutRoi,
  StandardFilterWithoutNotFar,
  QuickExitFilter,
  DevFilter,
} from "../../../package/filter/Filter";

dotenv.config();

// Helpers mapping
const PERIOD_MAP: Record<string, CandlestickIntervalEnum> = {
  "15M": CandlestickIntervalEnum.FIFTEEN_MINUTES,
  "30M": CandlestickIntervalEnum.HALF_HOURLY,
  "1H": CandlestickIntervalEnum.HOURLY,
  "4H": CandlestickIntervalEnum.FOUR_HOURLY,
};

function mapPeriod(p?: string | null): CandlestickIntervalEnum {
  if (!p) return CandlestickIntervalEnum.HOURLY;
  return PERIOD_MAP[p.toUpperCase()] || CandlestickIntervalEnum.HOURLY;
}

function mapPosition(pos?: string | null): MixHoldSideEnum | null {
  if (!pos) return MixHoldSideEnum.LONG; // défaut historique
  const up = pos.toUpperCase();
  if (up === "LONG") return MixHoldSideEnum.LONG;
  if (up === "SHORT") return MixHoldSideEnum.SHORT;
  return MixHoldSideEnum.LONG;
}

function mapMarginMode(m?: string | null): MixMarginModeEnum {
  if (!m) return MixMarginModeEnum.CROSSED;
  const up = m.toLowerCase();
  if (up === "fixed" || up === "isolated") return MixMarginModeEnum.FIXED; // support alias
  return MixMarginModeEnum.CROSSED;
}

function mapFilter(name?: string | null) {
  switch (name) {
    case "StandardFilterWithoutRoi":
      return new StandardFilterWithoutRoi();
    case "StandardFilterWithoutNotFar":
      return new StandardFilterWithoutNotFar();
    case "QuickExitFilter":
      return new QuickExitFilter();
    case "DevFilter":
      return new DevFilter();
    case "StandardFilter":
    default:
      return new StandardFilter();
  }
}

function normalizeSymbols(symbols?: string[] | null): string[] {
  if (!symbols || symbols.length === 0) return ["BTC", "ETH", "XRP"]; // fallback
  return symbols.map((s) => s.replace(/USDT$/i, ""));
}

function mapIndicator(type?: string | null): IndicatorType {
  // On fait confiance aux valeurs seedées; fallback safe
  return (type as IndicatorType) || ("OR_MACD_ENV" as IndicatorType);
}

// Runner dev basé sur la configuration stockée en base
export async function runDev(profs?: Profile[]): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const investors = await prisma.investorProfile.findMany({
      where: { isActive: true },
    });

    if (investors.length === 0) {
      console.log("runDev: aucun investisseur actif trouvé");
      return;
    }

    for (const inv of investors) {
      const symbols = normalizeSymbols(inv.symbols as string[] | null);
      const period = mapPeriod(inv.period as string | null);
      const indicatorType = mapIndicator(inv.strategyName as string | null);
      const filterInstance = mapFilter(inv.filter as string | null);
      const position = mapPosition(inv.position as string | null);
      const leverage = (inv.leverage as number) || 5;
      const marginMode = mapMarginMode(inv.marginMode as string | null);
      const exitValue = inv.exit === true ? true : null; // on conserve tri-état (true / null)

      const groups: FutureGroup[] = [
        {
          period,
          indicator: { type: indicatorType },
          exit: exitValue,
          position: position ?? MixHoldSideEnum.LONG,
          activeLimit: false,
            // utilisation du filtre mappé
          filter: filterInstance,
          margeLeverage: leverage,
          marginMode,
          symbols,
        } as FutureGroup,
      ];

      const params: Params = {
        futureParam: { groups },
        spotParam: { groups: [] as SpotGroup[] },
        profiles: [Profile.FUTURE, Profile.DEV, ...(profs || [])],
      };

      try {
        console.log(
          JSON.stringify({
            scope: "runDev",
            investor: { id: inv.id, name: inv.name, type: inv.type },
            group: {
              indicator: indicatorType,
              period: inv.period,
              leverage,
              marginMode,
              exit: exitValue,
              symbols,
              filter: filterInstance.constructor.name,
            },
          })
        );
        await new Runner(new SecondaryAccountConfig(params)).run(
          inv // inv est de type Prisma InvestorProfile
        );
      } catch (e) {
        console.error(`runDev: erreur pour ${inv.name}`, e);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

export default runDev;

// Exécution directe (npm run runDev)
// Note: ESM n'a pas require.main, on détecte via argv
if (process.argv[1] && /runDev\.(ts|js)$/.test(process.argv[1])) {
  (async () => {
    const start = Date.now();
    console.log(JSON.stringify({ scope: 'runDev', event: 'start', ts: new Date().toISOString() }));
    try {
      await runDev();
      const dur = Date.now() - start;
      console.log(JSON.stringify({ scope: 'runDev', event: 'end', status: 'OK', durationMs: dur }));
    } catch (e) {
      const dur = Date.now() - start;
      console.error(JSON.stringify({ scope: 'runDev', event: 'end', status: 'ERROR', error: (e as Error).message, durationMs: dur }));
      process.exit(1);
    }
  })();
}
