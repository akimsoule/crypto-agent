import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";
import path from "path";
import { InvestorFactory } from "../netlify/trade.app/src/package/investor/InvestorFactory";
import { MixMarginModeEnum } from "../netlify/trade.app/src/package/common/MapperType";

const prisma = new PrismaClient();

/*
  Seed des investisseurs basé sur les presets de InvestorFactory.
  On stocke un sous-ensemble de presets avec des valeurs financières par défaut.
  Ajuste les listes de symbols selon ton univers de trading réel.
*/

type SeedInvestor = {
  name: string;
  type: string;
  symbols: string[];
  strategyName: string;
  filter: string;
  period: string;
  leverage: number;
  marginMode: string;
  position?: string | null;
  exit?: boolean;
  initialBalance: number;
  maxPositionSize: number;
  riskTolerance: number; // 0-1 (ex: 0.02 = 2%)
  isActive?: boolean;
  riskMin?: number | null;
  riskMax?: number | null;
};

// Mapping simplifié: strategyName = premier indicator type du preset
// filter = nom de classe du premier filtre

// Sélection de symboles par défaut (adapter)
const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

// Construction dynamique minimale à partir de PRESETS accessibles via Factory
// On ne peut pas importer directement la constante PRESETS (non exportée), donc on reconstitue
// une liste de types connus alignés avec InvestorType.
const INVESTOR_TYPES: string[] = [
  "conservative",
  "moderate", // nouveau type (tolérance risque 0.2-0.5)
  "balanced",
  "aggressive",
  "momentum",
  "contrarian",
  "trend_sniper",
  "stable_seeker",
  "degen",
  "microcap",
  "sentiment",
  "ath_rebound",
  "macd_master",
  "envelope_strategist",
  // Nouveaux archétypes ajoutés au PRESETS
  "active_trader",
  "speculative_gem",
  "institutional",
  "defi",
  "sustainable",
];

// Valeurs financières par profil (ex: plus de levier -> plus petit maxPositionSize / riskTolerance)
const FIN_RULES: Record<
  string,
  { initial: number; maxPos: number; risk: number }
> = {
  conservative: { initial: 5000, maxPos: 300, risk: 0.01 },
  moderate: { initial: 7500, maxPos: 480, risk: 0.016 },
  balanced: { initial: 8000, maxPos: 500, risk: 0.015 },
  aggressive: { initial: 10000, maxPos: 800, risk: 0.02 },
  momentum: { initial: 9000, maxPos: 600, risk: 0.018 },
  contrarian: { initial: 7000, maxPos: 450, risk: 0.015 },
  trend_sniper: { initial: 9500, maxPos: 700, risk: 0.02 },
  stable_seeker: { initial: 6000, maxPos: 350, risk: 0.012 },
  degen: { initial: 4000, maxPos: 300, risk: 0.03 },
  microcap: { initial: 5000, maxPos: 350, risk: 0.025 },
  sentiment: { initial: 8500, maxPos: 550, risk: 0.017 },
  ath_rebound: { initial: 7500, maxPos: 500, risk: 0.018 },
  macd_master: { initial: 9000, maxPos: 650, risk: 0.02 },
  envelope_strategist: { initial: 8200, maxPos: 520, risk: 0.017 },
  active_trader: { initial: 7000, maxPos: 550, risk: 0.025 },
  speculative_gem: { initial: 4500, maxPos: 320, risk: 0.035 },
  institutional: { initial: 15000, maxPos: 900, risk: 0.012 },
  defi: { initial: 8800, maxPos: 560, risk: 0.02 },
  sustainable: { initial: 6500, maxPos: 400, risk: 0.013 },
};

// Catégories macro de crypto-actifs -> liste de symboles (adapter selon ton univers)
const CATEGORY_SYMBOLS: Record<string, string[]> = {
  payment: ["BTCUSDT", "LTCUSDT", "BCHUSDT"],
  stablecoin: ["USDCUSDT"], // placeholders (rarement tradés directement)
  utility: ["ETHUSDT", "BNBUSDT", "SOLUSDT"],
  governance: ["UNIUSDT", "AAVEUSDT", "MKRUSDT"],
  nft: ["APEUSDT", "MANAUSDT", "SANDUSDT"],
  privacy: ["XMRUSDT", "ZECUSDT"],
  smart_contract: ["ETHUSDT", "ADAUSDT", "SOLUSDT", "AVAXUSDT"],
  enterprise: ["XRPUSDT", "XLMUSDT"],
  defi: ["UNIUSDT", "AAVEUSDT", "CRVUSDT", "COMPUSDT"],
  ai: ["RNDRUSDT", "FETUSDT", "GRTUSDT", "INJUSDT", "AGIXUSDT"],
};

// Règles financières spécifiques par catégorie (fallback -> balanced)
const CATEGORY_RULES: Record<
  string,
  { initial: number; maxPos: number; risk: number; leverage: number }
> = {
  payment: { initial: 9000, maxPos: 600, risk: 0.015, leverage: 5 },
  stablecoin: { initial: 5000, maxPos: 200, risk: 0.005, leverage: 2 },
  utility: { initial: 9500, maxPos: 650, risk: 0.018, leverage: 6 },
  governance: { initial: 8000, maxPos: 500, risk: 0.017, leverage: 5 },
  nft: { initial: 6000, maxPos: 350, risk: 0.022, leverage: 4 },
  privacy: { initial: 7000, maxPos: 400, risk: 0.02, leverage: 5 },
  smart_contract: { initial: 10000, maxPos: 700, risk: 0.02, leverage: 6 },
  enterprise: { initial: 7500, maxPos: 450, risk: 0.015, leverage: 4 },
  defi: { initial: 8500, maxPos: 550, risk: 0.02, leverage: 5 },
  ai: { initial: 9000, maxPos: 600, risk: 0.022, leverage: 6 },
};

async function upsertInvestor(i: SeedInvestor) {
  await prisma.investorProfile.upsert({
    where: { name: i.name },
    update: {
      symbols: i.symbols,
      strategyName: i.strategyName,
      filter: i.filter,
      period: i.period,
      leverage: i.leverage,
      marginMode: i.marginMode,
      position: i.position ?? undefined,
      exit: i.exit ?? null,
      initialBalance: i.initialBalance,
      maxPositionSize: i.maxPositionSize,
      riskTolerance: i.riskTolerance,
      isActive: i.isActive ?? true,
      type: i.type,
      riskMin: i.riskMin ?? null,
      riskMax: i.riskMax ?? null,
    },
    create: {
      name: i.name,
      type: i.type,
      symbols: i.symbols,
      strategyName: i.strategyName,
      filter: i.filter,
      period: i.period,
      leverage: i.leverage,
      marginMode: i.marginMode,
      position: i.position ?? null,
      exit: i.exit ?? null,
      initialBalance: i.initialBalance,
      maxPositionSize: i.maxPositionSize,
      riskTolerance: i.riskTolerance,
      isActive: i.isActive ?? true,
      riskMin: i.riskMin ?? null,
      riskMax: i.riskMax ?? null,
    },
  });
}

export async function main() {
  console.log("Seeding investors...");

  const getIntervalId = (p: unknown): string => {
    if (!p) return "1H";
    const obj = p as { futureIntervalId?: string; spotIntervalId?: string };
    return obj.futureIntervalId || obj.spotIntervalId || "1H";
  };

  // Pour obtenir les presets nous fabriquons un InvestorAgent factice par type et lisons le résultat
  // via InvestorFactory.fromInvestor (qui applique les defaults de PRESETS).
  for (const type of INVESTOR_TYPES) {
    // Construction d'un agent minimal
    // Agent minimal conforme à InvestorAgent (propriétés supplémentaires neutres)
    const agent = {
      id: `seed-${type}`,
      name: type,
      type: type,
      riskTolerance: 0.01,
      maxPositionSize: 0,
      holdingPeriod: 0,
      cooldown: 0,
      lastActive: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    try {
      const composition = InvestorFactory.fromInvestor(
        agent,
        DEFAULT_SYMBOLS,
        {}
      );
      const firstGroup = composition.groups[0];
      const leverage = firstGroup.margeLeverage as number;
      const periodValue = getIntervalId(firstGroup.period);
      const strategyName = firstGroup.indicator.type;
      const filterInstance = firstGroup.filter;
      const filterName = filterInstance.constructor?.name || "UnknownFilter";
      const marginMode = firstGroup.marginMode ?? MixMarginModeEnum.CROSSED;
      const position = firstGroup.position ?? null;

      const fin = FIN_RULES[type] || {
        initial: 5000,
        maxPos: 300,
        risk: 0.015,
      };

      await upsertInvestor({
        name: type,
        type: "future",
        symbols: DEFAULT_SYMBOLS,
        strategyName,
        filter: filterName,
        period: periodValue,
        leverage,
        marginMode: String(marginMode),
        position: position ? String(position) : null,
        exit: firstGroup.exit === true ? true : undefined,
        initialBalance: fin.initial,
        maxPositionSize: fin.maxPos,
        riskTolerance: fin.risk,
        isActive: true,
        riskMin: composition.riskRange ? composition.riskRange[0] : null,
        riskMax: composition.riskRange ? composition.riskRange[1] : null,
      });
      console.log(`✔ Seeded investor ${type}`);
    } catch (e) {
      console.error(
        `❌ Failed seeding investor ${type}:`,
        (e as Error).message
      );
    }
  }

  // Ajout des investisseurs par catégorie macro
  console.log("Seeding category investors...");
  for (const category of Object.keys(CATEGORY_SYMBOLS)) {
    const symbols = CATEGORY_SYMBOLS[category];
    const rule = CATEGORY_RULES[category] || {
      initial: 8000,
      maxPos: 500,
      risk: 0.015,
      leverage: 5,
    };
    // On réutilise InvestorFactory avec un type inconnu -> fallback preset balanced
    const pseudoProfile = {
      id: `cat-${category}`,
      name: `cat_${category}`,
      type: category,
    };
    try {
      const composition = InvestorFactory.fromInvestor(pseudoProfile, symbols, {
        leverage: rule.leverage,
      });
      const group = composition.groups[0];
      await upsertInvestor({
        name: `cat_${category}`,
        type: "future",
        symbols,
        strategyName: group.indicator.type,
        filter: group.filter.constructor?.name || "StandardFilter",
        period: getIntervalId(group.period),
        leverage: group.margeLeverage as number,
        marginMode: String(group.marginMode || MixMarginModeEnum.CROSSED),
        position: group.position ? String(group.position) : null,
        exit: group.exit === true ? true : undefined,
        initialBalance: rule.initial,
        maxPositionSize: rule.maxPos,
        riskTolerance: rule.risk,
        isActive: true,
        riskMin: composition.riskRange ? composition.riskRange[0] : null,
        riskMax: composition.riskRange ? composition.riskRange[1] : null,
      });
      console.log(`✔ Seeded category investor cat_${category}`);
    } catch (e) {
      console.error(
        `❌ Failed seeding category ${category}`,
        (e as Error).message
      );
    }
  }

  console.log("Seed investors complete.");
}

// Exécution directe (ESM friendly)
const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
