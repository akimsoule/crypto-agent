import { InvestorProfile, PrismaClient } from "@prisma/client";
import {
  CustomTelegramBot,
  SecondaryAccountConfig,
} from "../../../package/common/Config";
import {
  FutureGroup,
  MixHoldSideEnum,
  Params,
  Profile,
  SpotGroup,
} from "../../../package/common/MapperType";
import { Runner } from "../../../package/common/Runner";
import {
  InvestorDevFilter,
  InvestorProdFilter,
} from "../../../package/filter/Filter";
import {
  mapPeriod,
  mapPosition,
  mapMarginMode,
  normalizeSymbols,
  mapIndicator,
} from "../../../package/common/MapperLib";
import axios from "axios";

// Runner dev basé sur la configuration stockée en base
export async function runDev(profs?: Profile[]): Promise<void> {
  const prisma = new PrismaClient();
  const isProdEnv = profs?.includes(Profile.PROD);

  try {
    const investors = (await prisma.investorProfile.findMany({
      where: { isActive: true },
    })) as InvestorProfile[];

    if (investors.length === 0) {
      console.log("runDev: aucun investisseur actif trouvé");
      return;
    }

    // Accumule les couples (investorId, symbol) exécutés pour batch upsert
    const executed: { profileId: string; symbol: string }[] = [];

    let telegramClient: CustomTelegramBot | undefined = undefined;

    for (const inv of investors) {
      const symbols = normalizeSymbols(inv.symbols as string[] | null);
      const period = mapPeriod(inv.period as string | null);
      const indicatorType = mapIndicator(inv.strategyName as string | null);
      const filterInstance = isProdEnv
        ? new InvestorProdFilter()
        : new InvestorDevFilter();
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

      const profiles: Profile[] = isProdEnv
        ? [Profile.FUTURE, Profile.PROD]
        : [Profile.FUTURE, Profile.DEV];

      const params: Params = {
        futureParam: { groups },
        spotParam: { groups: [] as SpotGroup[] },
        profiles,
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
        const config = new SecondaryAccountConfig(params);
        if (!telegramClient) {
          telegramClient = config.telegramClient;
        }
        const runner = new Runner(config);
        await runner.run(inv);
        // Enregistre les symboles visités
        for (const s of symbols) {
          executed.push({
            profileId: inv.id,
            symbol: s.toUpperCase() + "USDT",
          });
        }
      } catch (e) {
        console.error(`runDev: erreur pour ${inv.name}`, e);
      }
    }

    // Batch upsert final (dernière date d'exécution)
    if (executed.length && isProdEnv) {
      const now = new Date();
      // Utilise un Set pour éviter doublons en cas de symboles répétés
      const uniq = new Map<string, { profileId: string; symbol: string }>();
      for (const e of executed) {
        uniq.set(e.profileId + "::" + e.symbol, e);
      }
      const rows = Array.from(uniq.values());
      // Prisma n'a pas de batchUpsert natif: on fait des upserts parallélisés raisonnablement
      const CONC = 10;
      let i = 0;
      while (i < rows.length) {
        const slice = rows.slice(i, i + CONC);
        await Promise.all(
          slice.map((r) =>
            prisma.investorSymbolExecution.upsert({
              where: {
                profileId_symbol: { profileId: r.profileId, symbol: r.symbol },
              },
              update: { lastExecutedAt: now },
              create: {
                profileId: r.profileId,
                symbol: r.symbol,
                lastExecutedAt: now,
              },
            })
          )
        );
        i += CONC;
      }
      console.log(
        JSON.stringify({
          scope: "runDev",
          event: "executionIndexPersisted",
          count: rows.length,
        })
      );

      const toDate = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Toronto" })
      );
      const hour = toDate.getHours();
      const minute = toDate.getMinutes();
      let message = `[From:${process.platform} - Secondary config - FutureInvestorAccount][At:${hour
        .toString()
        .padStart(2, "0")}:${minute.toString().padStart(2, "0")}]`;

      if (this.message && this.message.length > 0) {
        message += "\n" + this.message;
      }

      console.log(message);

      if (
        telegramClient &&
        process.env.APP_ENV === Profile.PROD &&
        (hour === 8 || hour === 16) &&
        minute >= 0 &&
        minute <= 3
      ) {
        try {
          const data = (await axios.get("https://zenquotes.io/api/random"))
            .data;
          const quote = data[0]; // Accède au premier élément du tableau
          message += `\n${quote.q} By ${quote.a}`;
        } catch (e) {
          console.log(e);
        }

        await telegramClient.sendMessage(
          this.config.telegramGroupOrderId,
          message
        );
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
    console.log(
      JSON.stringify({
        scope: "runDev",
        event: "start",
        ts: new Date().toISOString(),
      })
    );
    try {
      await runDev();
      const dur = Date.now() - start;
      console.log(
        JSON.stringify({
          scope: "runDev",
          event: "end",
          status: "OK",
          durationMs: dur,
        })
      );
    } catch (e) {
      const dur = Date.now() - start;
      console.error(
        JSON.stringify({
          scope: "runDev",
          event: "end",
          status: "ERROR",
          error: (e as Error).message,
          durationMs: dur,
        })
      );
      process.exit(1);
    }
  })();
}
