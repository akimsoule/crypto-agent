import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";
import path from "path";
import { InvestorFactory } from "../netlify/trade.app/src/package/investor/InvestorFactory";
import { MixMarginModeEnum } from "../netlify/trade.app/src/package/common/MapperType";

const prisma = new PrismaClient();

/*
  Seed refactorisé des investisseurs utilisant:
  - Uniquement Profile.FUTURE
  - Uniquement les filtres d'investisseurs
  - Structure plus simple et maintenable
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
  riskTolerance: number;
  isActive?: boolean;
  riskMin?: number | null;
  riskMax?: number | null;
};

// Sélection de symboles par défaut - concentrés sur les principales crypto
const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

// Types d'investisseurs supportés (alignés avec InvestorType)
const INVESTOR_TYPES: string[] = [
  "conservative",
  "moderate",
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
  "active_trader",
  "speculative_gem",
  "institutional",
  "defi",
  "sustainable",
];

// Valeurs financières simplifiées par profil de risque
const FINANCIAL_PROFILES: Record<
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

// Catégories crypto avec symboles associés
const CRYPTO_CATEGORIES: Record<string, string[]> = {
  payment: ["BTCUSDT", "LTCUSDT", "BCHUSDT", "DOGEUSDT", "XRPUSDT", "ADAUSDT"],
  utility: [
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "DOTUSDT",
    "MATICUSDT",
    "AVAXUSDT",
  ],
  governance: [
    "UNIUSDT",
    "AAVEUSDT",
    "MKRUSDT",
    "SUSHIUSDT",
    "SNXUSDT",
    "CRVUSDT",
  ],
  enterprise: ["XRPUSDT", "XLMUSDT", "HBARUSDT", "MITHUSDT", "QTUMUSDT"],
  defi: ["UNIUSDT", "AAVEUSDT", "CRVUSDT", "COMPUSDT", "BALUSDT", "YFIUSDT"],
  ai: ["RNDRUSDT", "FETUSDT", "GRTUSDT", "INJUSDT", "OCEANUSDT", "AGIXUSDT"],
  gaming: [
    "ENJUSDT",
    "SANDUSDT",
    "AXSUSDT",
    "MANAUSDT",
    "GALAUSDT",
    "ALICEUSDT",
  ],
  nft: ["FLOWUSDT", "OPUSDT", "RARIUSDT", "SANDUSDT", "LOKAUSDT"],
  privacy: ["XMRUSDT", "ZECUSDT", "DASHUSDT", "GRINUSDT", "SCRTUSDT"],
};

// Règles financières par catégorie
const CATEGORY_FINANCIAL_RULES: Record<
  string,
  { initial: number; maxPos: number; risk: number; leverage: number }
> = {
  payment: { initial: 9000, maxPos: 600, risk: 0.015, leverage: 5 },
  utility: { initial: 9500, maxPos: 650, risk: 0.018, leverage: 6 },
  governance: { initial: 8000, maxPos: 500, risk: 0.017, leverage: 5 },
  enterprise: { initial: 7500, maxPos: 450, risk: 0.015, leverage: 4 },
  defi: { initial: 8500, maxPos: 550, risk: 0.02, leverage: 5 },
  ai: { initial: 9000, maxPos: 600, risk: 0.022, leverage: 6 },
  gaming: { initial: 7000, maxPos: 500, risk: 0.025, leverage: 4 },
  nft: { initial: 6000, maxPos: 400, risk: 0.028, leverage: 3 },
  privacy: { initial: 8000, maxPos: 550, risk: 0.02, leverage: 5 },
};

/**
 * Fonction utilitaire pour extraire l'ID d'intervalle
 */
function getIntervalId(period: unknown): string {
  if (!period) return "1H";
  const periodObj = period as {
    futureIntervalId?: string;
    spotIntervalId?: string;
  };
  return periodObj.futureIntervalId || periodObj.spotIntervalId || "1H";
}

/**
 * Upsert un investisseur dans la base de données
 */
async function upsertInvestor(investor: SeedInvestor): Promise<void> {
  await prisma.investorProfile.upsert({
    where: { name: investor.name },
    update: {
      symbols: investor.symbols,
      strategyName: investor.strategyName,
      filter: investor.filter,
      period: investor.period,
      leverage: investor.leverage,
      marginMode: investor.marginMode,
      position: investor.position ?? undefined,
      exit: investor.exit ?? null,
      initialBalance: investor.initialBalance,
      maxPositionSize: investor.maxPositionSize,
      riskTolerance: investor.riskTolerance,
      isActive: investor.isActive ?? true,
      type: investor.type,
      riskMin: investor.riskMin ?? null,
      riskMax: investor.riskMax ?? null,
    },
    create: {
      name: investor.name,
      type: investor.type,
      symbols: investor.symbols,
      strategyName: investor.strategyName,
      filter: investor.filter,
      period: investor.period,
      leverage: investor.leverage,
      marginMode: investor.marginMode,
      position: investor.position ?? null,
      exit: investor.exit ?? null,
      initialBalance: investor.initialBalance,
      maxPositionSize: investor.maxPositionSize,
      riskTolerance: investor.riskTolerance,
      isActive: investor.isActive ?? true,
      riskMin: investor.riskMin ?? null,
      riskMax: investor.riskMax ?? null,
    },
  });
}

/**
 * Seed les investisseurs de base à partir des presets
 */
async function seedBaseInvestors(): Promise<void> {
  console.log("Seeding base investors...");

  for (const type of INVESTOR_TYPES) {
    const mockInvestor = {
      id: `seed-${type}`,
      name: type,
      type: type,
    };

    try {
      const composition = InvestorFactory.fromInvestor(
        mockInvestor,
        DEFAULT_SYMBOLS,
        {}
      );
      const firstGroup = composition.groups[0];

      if (!firstGroup) {
        console.warn(`⚠️ No groups found for investor type ${type}`);
        continue;
      }

      const leverage = firstGroup.margeLeverage;
      const periodValue = getIntervalId(firstGroup.period);
      const strategyName = firstGroup.indicator.type;
      const filterName = firstGroup.filter.constructor?.name || "UnknownFilter";
      const marginMode = firstGroup.marginMode ?? MixMarginModeEnum.CROSSED;
      const position = firstGroup.position ?? null;

      const financialProfile = FINANCIAL_PROFILES[type] || {
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
        initialBalance: financialProfile.initial,
        maxPositionSize: financialProfile.maxPos,
        riskTolerance: financialProfile.risk,
        isActive: true,
        riskMin: composition.riskRange ? composition.riskRange[0] : null,
        riskMax: composition.riskRange ? composition.riskRange[1] : null,
      });

      console.log(`✔ Seeded investor ${type}`);
    } catch (error) {
      console.error(
        `❌ Failed seeding investor ${type}:`,
        (error as Error).message
      );
    }
  }
}

/**
 * Seed les investisseurs par catégorie crypto
 */
async function seedCategoryInvestors(): Promise<void> {
  console.log("Seeding category investors...");

  for (const [category, symbols] of Object.entries(CRYPTO_CATEGORIES)) {
    const rule = CATEGORY_FINANCIAL_RULES[category] || {
      initial: 8000,
      maxPos: 500,
      risk: 0.015,
      leverage: 5,
    };

    const mockProfile = {
      id: `cat-${category}`,
      name: `cat_${category}`,
      type: category,
    };

    try {
      const composition = InvestorFactory.fromInvestor(mockProfile, symbols, {
        leverage: rule.leverage,
      });

      const group = composition.groups[0];
      if (!group) {
        console.warn(`⚠️ No groups found for category ${category}`);
        continue;
      }

      await upsertInvestor({
        name: `cat_${category}`,
        type: "future",
        symbols,
        strategyName: group.indicator.type,
        filter: group.filter.constructor?.name || "StandardFilter",
        period: getIntervalId(group.period),
        leverage: group.margeLeverage,
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
    } catch (error) {
      console.error(
        `❌ Failed seeding category ${category}:`,
        (error as Error).message
      );
    }
  }
}

/**
 * Seed les presets de production explicites
 */
async function seedProductionPresets(): Promise<void> {
  console.log("Seeding production investor presets...");

  const prodPresets = [
    { key: "conservative_prod", baseType: "conservative" },
    { key: "balanced_prod", baseType: "balanced" },
    { key: "aggressive_prod", baseType: "aggressive" },
  ] as const;

  for (const preset of prodPresets) {
    try {
      const composition = InvestorFactory.fromInvestor(
        { id: `seed-${preset.key}`, name: preset.key, type: preset.key },
        DEFAULT_SYMBOLS,
        {}
      );

      const group = composition.groups[0];
      if (!group) {
        console.warn(`⚠️ No groups found for prod preset ${preset.key}`);
        continue;
      }

      const financialProfile = FINANCIAL_PROFILES[preset.baseType] || {
        initial: 8000,
        maxPos: 500,
        risk: 0.015,
      };

      await upsertInvestor({
        name: preset.key,
        type: "future",
        symbols: DEFAULT_SYMBOLS,
        strategyName: group.indicator.type,
        filter: group.filter.constructor?.name || "StandardFilter",
        period: getIntervalId(group.period),
        leverage: group.margeLeverage,
        marginMode: String(group.marginMode || MixMarginModeEnum.CROSSED),
        position: group.position ? String(group.position) : null,
        exit: group.exit === true ? true : undefined,
        initialBalance: financialProfile.initial,
        maxPositionSize: financialProfile.maxPos,
        riskTolerance: financialProfile.risk,
        isActive: true,
        riskMin: composition.riskRange ? composition.riskRange[0] : null,
        riskMax: composition.riskRange ? composition.riskRange[1] : null,
      });

      console.log(`✔ Seeded prod preset ${preset.key}`);
    } catch (error) {
      console.error(
        `❌ Failed seeding prod preset ${preset.key}:`,
        (error as Error).message
      );
    }
  }
}

/**
 * Seed spécifique: investisseurs par symbole avec paramètres MACD (fast, slow, signal)
 * Les valeurs win%, roi%, hebdo$ ne sont pas stockées (dérivables), on capture seulement la config de base.
 */
// Génère un nom de stratégie MACD standardisé (ex: MACD_12_26_9)
function buildMacdStrategyName(
  fast: number,
  slow: number,
  signal: number
): string {
  return `MACD_${fast}_${slow}_${signal}`;
}

async function seedMacdSymbolInvestors(): Promise<void> {
  console.log("Seeding MACD symbol investors (ROI table)...");
  // Données brutes fournies (fast, slow, signal)
  const rows: Array<{
    symbolRaw: string;
    fast: number;
    slow: number;
    signal: number;
  }> = [
    { symbolRaw: "NMRUSDT_UMCBL", fast: 14, slow: 21, signal: 8 },
    { symbolRaw: "XNYUSDT_UMCBL", fast: 14, slow: 26, signal: 9 },
    { symbolRaw: "API3USDT_UMCBL", fast: 9, slow: 26, signal: 8 },
    { symbolRaw: "PROMPTUSDT_UMCBL", fast: 9, slow: 26, signal: 8 },
    { symbolRaw: "NAORISUSDT_UMCBL", fast: 13, slow: 34, signal: 8 },
    { symbolRaw: "USELESSUSDT_UMCBL", fast: 9, slow: 34, signal: 8 },
    { symbolRaw: "IDOLUSDT_UMCBL", fast: 13, slow: 34, signal: 8 },
    { symbolRaw: "FHEUSDT_UMCBL", fast: 9, slow: 21, signal: 7 },
    { symbolRaw: "ROAMUSDT_UMCBL", fast: 14, slow: 34, signal: 8 },
    { symbolRaw: "AIOUSDT_UMCBL", fast: 14, slow: 26, signal: 10 },
    { symbolRaw: "SKLUSDT_UMCBL", fast: 9, slow: 34, signal: 7 },
    { symbolRaw: "AVAILUSDT_UMCBL", fast: 13, slow: 26, signal: 7 },
    { symbolRaw: "BRUSDT_UMCBL", fast: 12, slow: 21, signal: 8 },
    { symbolRaw: "YALAUSDT_UMCBL", fast: 9, slow: 34, signal: 7 },
    { symbolRaw: "LAUNCHCOINUSDT_UMCBL", fast: 14, slow: 21, signal: 8 },
    { symbolRaw: "ALPHAUSDT_UMCBL", fast: 12, slow: 26, signal: 7 },
    { symbolRaw: "ORDERUSDT_UMCBL", fast: 9, slow: 21, signal: 7 },
    { symbolRaw: "HOUSEUSDT_UMCBL", fast: 9, slow: 34, signal: 10 },
    { symbolRaw: "BIDUSDT_UMCBL", fast: 9, slow: 34, signal: 8 },
    { symbolRaw: "ATHUSDT_UMCBL", fast: 14, slow: 34, signal: 10 },
  ];

  for (const r of rows) {
    // Normaliser le symbole: retirer suffixe _UMCBL si présent
    const symbol = r.symbolRaw.replace(/_UMCBL$/i, "");
    const strategyName = buildMacdStrategyName(r.fast, r.slow, r.signal);
    // Nom investisseur unique
    const name = `macd_${symbol.toLowerCase()}`; // ex: macd_nmrusdt
    try {
      await upsertInvestor({
        name,
        type: "future",
        symbols: [symbol],
        strategyName,
        filter: "StandardFilter",
        period: "1H",
        leverage: 5,
        marginMode: String(MixMarginModeEnum.CROSSED),
        position: null,
        exit: false,
        initialBalance: 5000,
        maxPositionSize: 300,
        riskTolerance: 0.02,
        isActive: true,
        riskMin: null,
        riskMax: null,
      });
      console.log(`✔ Seeded MACD investor ${name} (${symbol})`);
    } catch (e) {
      console.error(
        `❌ Failed seeding MACD investor for ${symbol}:`,
        (e as Error).message
      );
    }
  }
}

/**
 * Variante groupée: crée un investisseur par combinaison (fast,slow,signal) regroupant tous les symboles partageant ces paramètres.
 */
async function seedMacdGroupedInvestors(): Promise<void> {
  console.log("Seeding grouped MACD investors (one per parameter set)...");
  const rows: Array<{
    symbolRaw: string;
    fast: number;
    slow: number;
    signal: number;
  }> = [
    { symbolRaw: "NMRUSDT_UMCBL", fast: 14, slow: 21, signal: 8 },
    { symbolRaw: "XNYUSDT_UMCBL", fast: 14, slow: 26, signal: 9 },
    { symbolRaw: "API3USDT_UMCBL", fast: 9, slow: 26, signal: 8 },
    { symbolRaw: "PROMPTUSDT_UMCBL", fast: 9, slow: 26, signal: 8 },
    { symbolRaw: "NAORISUSDT_UMCBL", fast: 13, slow: 34, signal: 8 },
    { symbolRaw: "USELESSUSDT_UMCBL", fast: 9, slow: 34, signal: 8 },
    { symbolRaw: "IDOLUSDT_UMCBL", fast: 13, slow: 34, signal: 8 },
    { symbolRaw: "FHEUSDT_UMCBL", fast: 9, slow: 21, signal: 7 },
    { symbolRaw: "ROAMUSDT_UMCBL", fast: 14, slow: 34, signal: 8 },
    { symbolRaw: "AIOUSDT_UMCBL", fast: 14, slow: 26, signal: 10 },
    { symbolRaw: "SKLUSDT_UMCBL", fast: 9, slow: 34, signal: 7 },
    { symbolRaw: "AVAILUSDT_UMCBL", fast: 13, slow: 26, signal: 7 },
    { symbolRaw: "BRUSDT_UMCBL", fast: 12, slow: 21, signal: 8 },
    { symbolRaw: "YALAUSDT_UMCBL", fast: 9, slow: 34, signal: 7 },
    { symbolRaw: "LAUNCHCOINUSDT_UMCBL", fast: 14, slow: 21, signal: 8 },
    { symbolRaw: "ALPHAUSDT_UMCBL", fast: 12, slow: 26, signal: 7 },
    { symbolRaw: "ORDERUSDT_UMCBL", fast: 9, slow: 21, signal: 7 },
    { symbolRaw: "HOUSEUSDT_UMCBL", fast: 9, slow: 34, signal: 10 },
    { symbolRaw: "BIDUSDT_UMCBL", fast: 9, slow: 34, signal: 8 },
    { symbolRaw: "ATHUSDT_UMCBL", fast: 14, slow: 34, signal: 10 },
  ];
  // Regrouper par clé paramètres
  const groups = new Map<
    string,
    { fast: number; slow: number; signal: number; symbols: string[] }
  >();
  for (const r of rows) {
    const symbol = r.symbolRaw.replace(/_UMCBL$/i, "");
    const key = `${r.fast}-${r.slow}-${r.signal}`;
    if (!groups.has(key)) {
      groups.set(key, {
        fast: r.fast,
        slow: r.slow,
        signal: r.signal,
        symbols: [],
      });
    }
    groups.get(key)!.symbols.push(symbol);
  }

  for (const g of groups.values()) {
    const strategyName = buildMacdStrategyName(g.fast, g.slow, g.signal);
    const name = `macd_set_${g.fast}_${g.slow}_${g.signal}`; // ex: macd_set_9_26_8
    try {
      await upsertInvestor({
        name,
        type: "future",
        symbols: g.symbols,
        strategyName,
        filter: "StandardFilter",
        period: "1H",
        leverage: 5,
        marginMode: String(MixMarginModeEnum.CROSSED),
        position: null,
        exit: false,
        initialBalance: 6000, // légèrement supérieur car multi-symboles
        maxPositionSize: 400,
        riskTolerance: 0.025,
        isActive: true,
        riskMin: null,
        riskMax: null,
      });
      console.log(
        `✔ Seeded grouped MACD investor ${name} (${g.symbols.length} symbols)`
      );
    } catch (e) {
      console.error(
        `❌ Failed seeding grouped MACD investor ${name}:`,
        (e as Error).message
      );
    }
  }
}

export async function main(): Promise<void> {
  console.log("🚀 Starting investor seeding process...");
  console.log("📊 Using simplified structure with Profile.FUTURE only");

  try {
    await seedBaseInvestors();
    await seedCategoryInvestors();
    await seedProductionPresets();
    await seedMacdSymbolInvestors();
    await seedMacdGroupedInvestors();

    console.log("✅ Investor seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

// Exécution directe (ESM friendly)
const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
