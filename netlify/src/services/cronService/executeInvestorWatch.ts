import { PrismaClient } from "@prisma/client";
import { InvestorAgent } from "../../domain/investor/investorAgent";
import { TelegramBot } from "../../infrastructure/external/teleg";
import { Investment } from "../../../../types/investor";
import { computeMACD, computeEnvelope } from "../../utils/indicators";
import type { CronExecutionResult, InvestorResult } from "./types";

// Types pour le mapping des gems
interface GemBase {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  volume_24h: number;
  total_volume: number;
  circulating_supply: number;
  max_supply?: number;
  ath: number;
  ath_change_percentage: number;
  gemScore?: number;
  last_updated: string;
  socialSentiment?: {
    score: number;
    mentions: number;
    positiveRatio: number;
  };
}

interface GemWithIndicators extends GemBase {
  macd?: ReturnType<typeof computeMACD>;
  envelope?: ReturnType<typeof computeEnvelope>;
}

/**
 * Exécute la surveillance des investisseurs
 */
export async function executeInvestorWatch(prisma?: PrismaClient): Promise<CronExecutionResult> {
  const startTime = Date.now();
  const runId = `investor-watch-${Date.now()}`;

  try {
    console.log("🚀 Démarrage de la surveillance des investisseurs...");

    const db = prisma || new PrismaClient();

    // 1. Initialiser les services
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN || "";
    const telegramChatId = process.env.TELEGRAM_CHAT_ID || "";

    if (!telegramToken || !telegramChatId) {
      console.log(
        "⚠️ Configuration Telegram manquante, notifications désactivées"
      );
    }

    const telegramBot =
      telegramToken && telegramChatId
        ? new TelegramBot(telegramToken, telegramChatId)
        : null;

    console.log("📊 Lecture des gems depuis la base de données...");

    // 2. Récupérer les gems déjà analysés depuis la base de données (optimisé)
    const gemsFromDB = await db.cryptoGemProject.findMany({
      where: {
        AND: [
          { gemScore: { gte: 40 } }, // Gems avec un score minimum
          {
            lastUpdated: {
              gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // Gems mis à jour dans les 2 dernières heures
            },
          },
          { currentPrice: { gt: 0 } }, // Prix valide
          { marketCap: { gt: 0 } }, // Market cap valide
        ],
      },
      orderBy: [
        { gemScore: "desc" },
        { priceChangePercentage24h: "desc" }, // Priorité aux gains récents
      ],
      take: 30, // Réduire à 30 gems pour éviter la surcharge des investisseurs
      select: {
        // Sélection optimisée - ne récupérer que les champs nécessaires
        coinId: true,
        symbol: true,
        name: true,
        currentPrice: true,
        marketCap: true,
        marketCapRank: true,
        priceChangePercentage24h: true,
        volume24h: true,
        totalVolume: true,
        circulatingSupply: true,
        maxSupply: true,
        ath: true,
        athChangePercentage: true,
        gemScore: true,
        lastUpdated: true,
        sentimentScore: true,
        sentimentMentions: true,
        sentimentPositiveRatio: true,
      },
    });

    // Récupérer l'historique des prix pour BTC, ETH, XRP (exemple: 30 derniers prix)
    async function fetchPriceHistory(symbol: string): Promise<number[]> {
      // À adapter selon ta source réelle (ici Coinpaprika)
      try {
        const res = await fetch(`https://api.coinpaprika.com/v1/tickers/${symbol}-usd/historical?start=${new Date(Date.now()-30*24*60*60*1000).toISOString()}&interval=1d`);
        const data = await res.json();
        return Array.isArray(data) ? data.map((d: { price: number }) => d.price) : [];
      } catch { return []; }
    }

    // Calculer les indicateurs pour BTC, ETH, XRP
    const priceHistories: Record<string, number[]> = {};
    for (const sym of ["btc", "eth", "xrp"]) {
      priceHistories[sym] = await fetchPriceHistory(sym);
    }

    // Mapping des gems enrichi
    const gems: (GemBase | GemWithIndicators)[] = gemsFromDB.map((gem) => {
      const symbolLower = gem.symbol.toLowerCase();
      if (["btc", "eth", "xrp"].includes(symbolLower)) {
        const prices = priceHistories[symbolLower] || [];
        return {
          id: gem.coinId,
          symbol: gem.symbol,
          name: gem.name,
          current_price: gem.currentPrice,
          market_cap: gem.marketCap,
          market_cap_rank: gem.marketCapRank,
          price_change_percentage_24h: gem.priceChangePercentage24h,
          volume_24h: gem.volume24h,
          total_volume: gem.totalVolume,
          circulating_supply: gem.circulatingSupply,
          max_supply: gem.maxSupply ?? undefined,
          ath: gem.ath,
          ath_change_percentage: gem.athChangePercentage,
          gemScore: gem.gemScore ?? undefined,
          last_updated: gem.lastUpdated.toISOString(),
          socialSentiment: gem.sentimentScore
            ? {
                score: gem.sentimentScore,
                mentions: gem.sentimentMentions || 0,
                positiveRatio: gem.sentimentPositiveRatio || 0,
              }
            : undefined,
          macd: prices.length ? computeMACD(prices) : undefined,
          envelope: prices.length ? computeEnvelope(prices) : undefined,
        };
      } else {
        return {
          id: gem.coinId,
          symbol: gem.symbol,
          name: gem.name,
          current_price: gem.currentPrice,
          market_cap: gem.marketCap,
          market_cap_rank: gem.marketCapRank,
          price_change_percentage_24h: gem.priceChangePercentage24h,
          volume_24h: gem.volume24h,
          total_volume: gem.totalVolume,
          circulating_supply: gem.circulatingSupply,
          max_supply: gem.maxSupply ?? undefined,
          ath: gem.ath,
          ath_change_percentage: gem.athChangePercentage,
          gemScore: gem.gemScore ?? undefined,
          last_updated: gem.lastUpdated.toISOString(),
          socialSentiment: gem.sentimentScore
            ? {
                score: gem.sentimentScore,
                mentions: gem.sentimentMentions || 0,
                positiveRatio: gem.sentimentPositiveRatio || 0,
              }
            : undefined,
        };
      }
    });

    console.log(`💎 ${gems.length} gems récupérés depuis la base de données`);

    if (gems.length === 0) {
      console.log("⚠️ Aucun gem trouvé en base de données - analyse annulée");
      return {
        success: true,
        timestamp: new Date().toISOString(),
        runId,
        summary: {
          gemsAnalyzed: 0,
          activeInvestors: 0,
          totalDecisions: 0,
          buyOrders: 0,
          sellOrders: 0,
          totalAmountInvested: 0,
          totalAmountSold: 0,
        },
        duration: Date.now() - startTime,
      };
    }

    // 3. Récupérer tous les investisseurs actifs
    const activeInvestors = await db.investorProfile.findMany({
      where: { isActive: true },
    });

    console.log(`👥 ${activeInvestors.length} investisseurs actifs trouvés`);

    if (activeInvestors.length === 0) {
      console.log("⚠️ Aucun investisseur actif trouvé");
      return {
        success: true,
        timestamp: new Date().toISOString(),
        runId,
        summary: {
          gemsAnalyzed: gems.length,
          activeInvestors: 0,
          totalDecisions: 0,
          buyOrders: 0,
          sellOrders: 0,
          totalAmountInvested: 0,
          totalAmountSold: 0,
        },
        duration: Date.now() - startTime,
      };
    }

    // 4. Faire analyser et agir chaque investisseur (avec gestion d'erreur optimisée)
    const allInvestments: Investment[] = [];
    const investorResults: InvestorResult[] = [];

    // Traitement parallèle des investisseurs pour améliorer les performances
    const investorPromises = activeInvestors.map(async (investorProfile) => {
      const startTime = Date.now();
      console.log(`🤖 ${investorProfile.name} démarre l'analyse...`);

      try {
        // Filtrer les indicateurs selon le profil
        let gemsForInvestor = gems;
        const type = investorProfile.type;
        const usesIndicators = ["macd_master", "envelope_strategist"].includes(type) || investorProfile.technicalWeight > 0.9;
        if (!usesIndicators) {
          // Retirer les indicateurs des gems si présents
          gemsForInvestor = gems.map(gem => {
            if ('macd' in gem || 'envelope' in gem) {
              const { macd, envelope, ...rest } = gem as GemWithIndicators;
              void macd;
              void envelope;
              return rest;
            }
            return gem;
          });
        }
        const investor = new InvestorAgent(investorProfile);
        const investments = await investor.analyzeAndAct(gemsForInvestor);

        const analysisTime = Date.now() - startTime;
        console.log(
          `✅ ${investorProfile.name}: ${investments.length} décisions en ${analysisTime}ms`
        );

        return {
          success: true,
          investments,
          result: {
            investorName: investorProfile.name,
            investorType: investorProfile.type,
            decisionsCount: investments.length,
            buyOrders: investments.filter((i) => i.action === "BUY").length,
            sellOrders: investments.filter((i) => i.action === "SELL").length,
            totalAmount: investments.reduce((sum, i) => sum + i.amount, 0),
            analysisTimeMs: analysisTime,
          },
        };
      } catch (error) {
        const analysisTime = Date.now() - startTime;
        console.error(
          `❌ Erreur pour ${investorProfile.name} après ${analysisTime}ms:`,
          error
        );

        return {
          success: false,
          investments: [],
          result: {
            investorName: investorProfile.name,
            investorType: investorProfile.type,
            error: error instanceof Error ? error.message : "Erreur inconnue",
            decisionsCount: 0,
            buyOrders: 0,
            sellOrders: 0,
            totalAmount: 0,
            analysisTimeMs: analysisTime,
          },
        };
      }
    });

    // Attendre tous les investisseurs (avec timeout de sécurité)
    const investorPromisesWithTimeout = investorPromises.map((promise) =>
      Promise.race([
        promise,
        new Promise(
          (_, reject) =>
            setTimeout(
              () => reject(new Error("Timeout: analyse trop longue")),
              30000
            ) // 30s timeout
        ),
      ])
    );

    const results = await Promise.allSettled(investorPromisesWithTimeout);

    // Traiter les résultats
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        const resultValue = result.value as {
          investments: Investment[];
          result: InvestorResult;
          success: boolean;
        };
        const { investments, result: investorResult } = resultValue;
        allInvestments.push(...investments);
        investorResults.push(investorResult);
      } else {
        console.error(
          "❌ Investisseur a échoué:",
          result.status === "rejected" ? result.reason : "Unknown error"
        );
        // Ajouter un résultat d'erreur générique
        investorResults.push({
          investorName: "Unknown",
          investorType: "Unknown",
          error: "Analyse échouée ou timeout",
          decisionsCount: 0,
          buyOrders: 0,
          sellOrders: 0,
          totalAmount: 0,
        });
      }
    }

    // 5. Sauvegarder les résultats de la simulation en une seule transaction
    const totalBuyOrders = allInvestments.filter(
      (i) => i.action === "BUY"
    ).length;
    const totalSellOrders = allInvestments.filter(
      (i) => i.action === "SELL"
    ).length;
    const totalAmountInvested = allInvestments
      .filter((i) => i.action === "BUY")
      .reduce((sum, i) => sum + i.amount, 0);
    const totalAmountSold = allInvestments
      .filter((i) => i.action === "SELL")
      .reduce((sum, i) => sum + i.amount, 0);

    // Calculer les meilleures/pires performances
    const bestPerformer = investorResults.reduce(
      (best, current) =>
        current.totalAmount > (best.totalAmount || 0) ? current : best,
      investorResults[0]
    );
    const worstPerformer = investorResults.reduce(
      (worst, current) =>
        current.totalAmount < (worst.totalAmount || Infinity)
          ? current
          : worst,
      investorResults[0]
    );

    // Transaction atomique pour sauvegarder les résultats
    try {
      await db.$transaction(async (tx) => {
        // Sauvegarder le run de simulation
        await tx.cryptoSimulationRun.create({
          data: {
            runId,
            gemsAnalyzed: gems.length,
            totalInvestments: allInvestments.length,
            totalBuyOrders,
            totalSellOrders,
            totalAmountInvested,
            totalAmountSold,
            activeInvestors: activeInvestors.length,
            bestPerformerName: bestPerformer?.investorName || null,
            bestPerformerReturn: bestPerformer?.totalAmount || null,
            worstPerformerName: worstPerformer?.investorName || null,
            worstPerformerReturn: worstPerformer?.totalAmount || null,
            avgReturnAllInvestors:
              investorResults.reduce((sum, r) => sum + r.totalAmount, 0) /
              (investorResults.length || 1),
          },
        });

        console.log("📊 Simulation sauvegardée avec les stats complètes");
      });
      console.log("✅ Données sauvegardées avec succès");
    } catch (dbError) {
      console.error("❌ Erreur lors de la sauvegarde:", dbError);
      // Continue malgré l'erreur de sauvegarde
    }

    // 6. Envoyer un résumé par Telegram optimisé
    if ((totalBuyOrders > 0 || totalSellOrders > 0) && telegramBot) {
      try {
        const avgAnalysisTime =
          investorResults
            .filter((r) => r.analysisTimeMs)
            .reduce((sum, r) => sum + (r.analysisTimeMs || 0), 0) /
          investorResults.filter((r) => r.analysisTimeMs).length;

        const topPerformers = investorResults
          .filter((r) => r.totalAmount > 0)
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 3);

        const summary = `
🤖 *Rapport Cron Investor Watch*

📊 *Analyse rapide:*
• ${gems.length} gems analysés (DB)
• ${activeInvestors.length} investisseurs actifs
• ⏱️ Temps moyen: ${avgAnalysisTime ? Math.round(avgAnalysisTime) : "?"}ms

💼 *Décisions prises:*
• ${totalBuyOrders} ordres d'achat 🟢
• ${totalSellOrders} ordres de vente 🔴
• ${allInvestments.length} décisions totales

💰 *Montants:*
• Investi: $${totalAmountInvested.toLocaleString()}
• Vendu: $${totalAmountSold.toLocaleString()}
• Net: $${(totalAmountInvested - totalAmountSold).toLocaleString()}

${
  topPerformers.length > 0
    ? `🏆 *Top Performers:*
${topPerformers
  .map(
    (p, i) =>
      `${i + 1}. ${p.investorName} - $${p.totalAmount.toFixed(0)} (${
        p.decisionsCount
      } décisions)`
  )
  .join("\n")}`
    : ""
}
            `.trim();

        await telegramBot.sendMessage(summary);
        console.log("📱 Résumé optimisé envoyé par Telegram");
      } catch (telegramError) {
        console.error(
          "❌ Erreur lors de l'envoi du message Telegram:",
          telegramError
        );
      }
    } else if (totalBuyOrders === 0 && totalSellOrders === 0) {
      console.log("📱 Aucune décision prise - pas de notification Telegram");
    }

    const duration = Date.now() - startTime;
    console.log("✅ Cron investor-watch terminé avec succès");
    console.log(
      `📈 Résumé: ${totalBuyOrders} achats, ${totalSellOrders} ventes, ${activeInvestors.length} investisseurs`
    );

    return {
      success: true,
      timestamp: new Date().toISOString(),
      runId,
      data: {
        investorResults,
        allInvestments,
      },
      summary: {
        gemsAnalyzed: gems.length,
        activeInvestors: activeInvestors.length,
        totalDecisions: allInvestments.length,
        buyOrders: totalBuyOrders,
        sellOrders: totalSellOrders,
        totalAmountInvested,
        totalAmountSold,
      },
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue";
    console.error("❌ Erreur dans le cron investor-watch:", errorMessage);

    // Envoyer une alerte d'erreur par Telegram si configuré
    try {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.TELEGRAM_CHAT_ID;

      if (telegramToken && telegramChatId) {
        const telegramBot = new TelegramBot(telegramToken, telegramChatId);
        await telegramBot.sendMessage(
          `
🚨 *Erreur Cron Investor Watch*

${errorMessage}

⏰ Timestamp: ${new Date().toISOString()}
            `.trim()
        );
      }
    } catch (telegramError) {
      console.error(
        "❌ Erreur lors de l'envoi de l'alerte Telegram:",
        telegramError
      );
    }

    return {
      success: false,
      timestamp: new Date().toISOString(),
      runId,
      error: errorMessage,
      duration,
    };
  }
}
