import { CryptoGemHunter } from "../domain/crypto/cryptoGemHunter";
import SocialMediaManager from "../infrastructure/external/socialMediaManager";
import { PrismaClient } from "@prisma/client";
import { InvestorAgent } from "../domain/investor/investorAgent";
import { TelegramBot } from "../infrastructure/external/teleg";
import { Investment } from "../../../types/investor";
import { DatabaseMonitor } from "../infrastructure/monitoring/databaseMonitor";

interface CronExecutionResult {
  success: boolean;
  timestamp: string;
  runId: string;
  data?: Record<string, unknown>;
  summary?: {
    gemsFound?: number;
    alertsGenerated?: number;
    postsCreated?: number;
    emailsSent?: number;
    itemsDeleted?: number;
    spaceSaved?: string;
    gemsAnalyzed?: number;
    activeInvestors?: number;
    totalDecisions?: number;
    buyOrders?: number;
    sellOrders?: number;
    totalAmountInvested?: number;
    totalAmountSold?: number;
    // Monitoring
    estimatedSizeMB?: number;
    healthScore?: number;
    needsAlert?: boolean;
  };
  error?: string;
  duration?: number;
}

// Types pour les résultats de l'investisseur
interface InvestorResult {
  investorName: string;
  investorType: string;
  decisionsCount: number;
  buyOrders: number;
  sellOrders: number;
  totalAmount: number;
  analysisTimeMs?: number; // Temps d'analyse en millisecondes
  error?: string;
}

interface CleanupStats extends Record<string, unknown> {
  alertsDeleted: number;
  gemsDeleted: number;
  investmentsDeleted: number;
  portfolioSnapshotsDeleted: number;
  simulationRunsDeleted: number;
  totalSpaceSaved: string;
  errors: string[];
}

export class CronService {
  private gemHunter: CryptoGemHunter;
  private socialManager: SocialMediaManager;
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.gemHunter = new CryptoGemHunter();
    this.socialManager = new SocialMediaManager({
      autoPost: true,
      gemScoreThreshold: 80, // Seuil plus élevé pour les publications automatiques
      priceChangeThreshold: 25,
    });
    this.prisma = prisma || new PrismaClient();
    // TelegramBot nécessite des paramètres, on l'initialisera quand nécessaire
  }

  /**
   * Exécute la tâche de recherche de gems crypto
   */
  async executeGemHunter(): Promise<CronExecutionResult> {
    const startTime = Date.now();
    const runId = `gem-hunter-${startTime}`;

    try {
      console.log("🚀 Lancement de l'analyse complète des gems...");

      // Exécuter le cycle complet d'analyse
      const result = await this.gemHunter.run();

      console.log("📊 Résultat de l'analyse:", {
        success: result.success,
        statusCode: result.statusCode,
        gemsFound: result.data?.totalGemsFound || 0,
        alertsGenerated: result.data?.alerts?.length || 0,
        message: result.message,
      });

      // Si des gems exceptionnelles sont trouvées, les publier sur Facebook
      if (result.success && result.data?.gems && result.data.gems.length > 0) {
        console.log("📱 Vérification des gems pour publication Facebook...");

        // Vérifier les alertes urgentes (gains > 50%)
        await this.socialManager.checkForUrgentAlerts();

        // Publier les meilleures gems trouvées
        await this.socialManager.autoPostToFacebook("gems");
      }

      const duration = Date.now() - startTime;

      return {
        success: result.success,
        timestamp: new Date().toISOString(),
        runId,
        data: result.data,
        summary: {
          gemsFound: result.data?.totalGemsFound || 0,
          alertsGenerated: result.data?.alerts?.length || 0,
        },
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";

      console.error("❌ Erreur dans le cron gem-hunter:", errorMessage);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        runId,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Exécute l'envoi de posts Facebook
   */
  async executeFacebookPosts(): Promise<CronExecutionResult> {
    const startTime = Date.now();
    const runId = `facebook-posts-${startTime}`;

    try {
      console.log("📱 Démarrage de la publication automatique Facebook...");

      const results = await Promise.all([
        this.socialManager.autoPostToFacebook("gems"),
        this.socialManager.autoPostToFacebook("performance"),
      ]);

      // Exécuter checkForUrgentAlerts séparément car elle ne retourne pas le même type
      await this.socialManager.checkForUrgentAlerts();

      const postsCreated = results.filter((r) => r && r.success).length;
      const duration = Date.now() - startTime;

      return {
        success: true,
        timestamp: new Date().toISOString(),
        runId,
        summary: {
          postsCreated,
        },
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";

      console.error("❌ Erreur dans le cron facebook-posts:", errorMessage);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        runId,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Exécute l'envoi de newsletters
   */
  async executeNewsletter(): Promise<CronExecutionResult> {
    const startTime = Date.now();
    const runId = `newsletter-${startTime}`;

    try {
      console.log("📧 Démarrage de l'envoi de newsletter...");

      // Cette logique devrait être implémentée avec le service email
      // Pour l'instant, simulons une exécution réussie

      const duration = Date.now() - startTime;

      return {
        success: true,
        timestamp: new Date().toISOString(),
        runId,
        summary: {
          emailsSent: 0, // À implémenter
        },
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";

      console.error("❌ Erreur dans le cron newsletter:", errorMessage);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        runId,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Nettoyage des données anciennes
   */
  async executeCleanup(): Promise<CronExecutionResult> {
    const startTime = Date.now();
    const runId = `cleanup-${startTime}`;

    // Configuration du nettoyage
    const CLEANUP_CONFIG = {
      // Alertes - garder seulement les 24 dernières heures
      alertsMaxAge: 24 * 60 * 60 * 1000, // 24h en ms
      // Projets gems - stratégie intelligente basée sur le score
      gemsLowScoreMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours pour score < 30
      gemsMediumScoreMaxAge: 14 * 24 * 60 * 60 * 1000, // 14 jours pour score 30-60
      gemsHighScoreMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours pour score > 60
      // Investissements - garder 3 mois d'historique
      investmentsMaxAge: 90 * 24 * 60 * 60 * 1000, // 90 jours
      // Portfolios snapshots - garder 1 mois
      portfolioSnapshotsMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
      // Simulation runs - garder 2 semaines
      simulationRunsMaxAge: 14 * 24 * 60 * 60 * 1000, // 14 jours
      // Seuils de sécurité
      maxGemsToDelete: 1000,
      maxInvestmentsToDelete: 5000,
      maxAlertsToDelete: 10000,
    };

    const stats: CleanupStats = {
      alertsDeleted: 0,
      gemsDeleted: 0,
      investmentsDeleted: 0,
      portfolioSnapshotsDeleted: 0,
      simulationRunsDeleted: 0,
      totalSpaceSaved: "0 MB",
      errors: [],
    };

    try {
      console.log("🧹 Démarrage du nettoyage des données...");

      // 1. Nettoyage des alertes anciennes
      const alertsCutoff = new Date(Date.now() - CLEANUP_CONFIG.alertsMaxAge);
      const alertsToDelete = await this.prisma.cryptoGemAlert.count({
        where: { createdAt: { lt: alertsCutoff } },
      });

      if (
        alertsToDelete > 0 &&
        alertsToDelete <= CLEANUP_CONFIG.maxAlertsToDelete
      ) {
        const alertsResult = await this.prisma.cryptoGemAlert.deleteMany({
          where: { createdAt: { lt: alertsCutoff } },
        });
        stats.alertsDeleted = alertsResult.count;
      } else if (alertsToDelete > CLEANUP_CONFIG.maxAlertsToDelete) {
        stats.errors.push(`Trop d'alertes à supprimer: ${alertsToDelete}`);
      }

      // 2. Nettoyage intelligent des gems selon leur score
      const lowScoreCutoff = new Date(
        Date.now() - CLEANUP_CONFIG.gemsLowScoreMaxAge
      );
      const lowScoreDeleted = await this.prisma.cryptoGemProject.deleteMany({
        where: {
          AND: [
            { lastUpdated: { lt: lowScoreCutoff } },
            { gemScore: { lt: 30 } },
          ],
        },
      });
      stats.gemsDeleted += lowScoreDeleted.count;

      const mediumScoreCutoff = new Date(
        Date.now() - CLEANUP_CONFIG.gemsMediumScoreMaxAge
      );
      const mediumScoreDeleted = await this.prisma.cryptoGemProject.deleteMany({
        where: {
          AND: [
            { lastUpdated: { lt: mediumScoreCutoff } },
            { gemScore: { gte: 30, lt: 60 } },
          ],
        },
      });
      stats.gemsDeleted += mediumScoreDeleted.count;

      const highScoreCutoff = new Date(
        Date.now() - CLEANUP_CONFIG.gemsHighScoreMaxAge
      );
      const highScoreDeleted = await this.prisma.cryptoGemProject.deleteMany({
        where: {
          AND: [
            { lastUpdated: { lt: highScoreCutoff } },
            { gemScore: { gte: 60 } },
          ],
        },
      });
      stats.gemsDeleted += highScoreDeleted.count;

      // 3. Nettoyage des investissements anciens
      const investmentsCutoff = new Date(
        Date.now() - CLEANUP_CONFIG.investmentsMaxAge
      );
      const investmentsToDelete = await this.prisma.cryptoInvestment.count({
        where: { timestamp: { lt: investmentsCutoff } },
      });

      if (
        investmentsToDelete > 0 &&
        investmentsToDelete <= CLEANUP_CONFIG.maxInvestmentsToDelete
      ) {
        const investmentsResult = await this.prisma.cryptoInvestment.deleteMany(
          {
            where: { timestamp: { lt: investmentsCutoff } },
          }
        );
        stats.investmentsDeleted = investmentsResult.count;
      } else if (investmentsToDelete > CLEANUP_CONFIG.maxInvestmentsToDelete) {
        stats.errors.push(
          `Trop d'investissements à supprimer: ${investmentsToDelete}`
        );
      }

      // 4. Nettoyage des snapshots de portfolio
      const portfolioCutoff = new Date(
        Date.now() - CLEANUP_CONFIG.portfolioSnapshotsMaxAge
      );
      const portfolioResult =
        await this.prisma.cryptoPortfolioSnapshot.deleteMany({
          where: { timestamp: { lt: portfolioCutoff } },
        });
      stats.portfolioSnapshotsDeleted = portfolioResult.count;

      // 5. Nettoyage des runs de simulation
      const simulationCutoff = new Date(
        Date.now() - CLEANUP_CONFIG.simulationRunsMaxAge
      );
      const simulationResult = await this.prisma.cryptoSimulationRun.deleteMany(
        {
          where: { timestamp: { lt: simulationCutoff } },
        }
      );
      stats.simulationRunsDeleted = simulationResult.count;

      // 6. Calcul de l'espace libéré
      const totalDeleted =
        stats.alertsDeleted +
        stats.gemsDeleted +
        stats.investmentsDeleted +
        stats.portfolioSnapshotsDeleted +
        stats.simulationRunsDeleted;

      const estimatedSpaceSaved = Math.round(totalDeleted * 1.2); // 1.2KB par enregistrement
      stats.totalSpaceSaved =
        estimatedSpaceSaved > 1000
          ? `${(estimatedSpaceSaved / 1000).toFixed(1)} MB`
          : `${estimatedSpaceSaved} KB`;

      const duration = Date.now() - startTime;

      console.log(
        `✅ Nettoyage terminé: ${totalDeleted} éléments supprimés, ${stats.totalSpaceSaved} libérés`
      );

      return {
        success: true,
        timestamp: new Date().toISOString(),
        runId,
        data: stats,
        summary: {
          itemsDeleted: totalDeleted,
          spaceSaved: stats.totalSpaceSaved,
        },
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";

      console.error("❌ Erreur dans le cron cleanup:", errorMessage);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        runId,
        data: stats,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Exécute la surveillance des investisseurs
   */
  async executeInvestorWatch(): Promise<CronExecutionResult> {
    const startTime = Date.now();
    const runId = `investor-watch-${Date.now()}`;

    try {
      console.log("🚀 Démarrage de la surveillance des investisseurs...");

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
      const gemsFromDB = await this.prisma.cryptoGemProject.findMany({
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

      // Convertir les gems de la DB au format attendu par les investisseurs
      const gems = gemsFromDB.map((gem) => ({
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
      }));

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
      const activeInvestors = await this.prisma.investorProfile.findMany({
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
          const investor = new InvestorAgent(investorProfile);
          const investments = await investor.analyzeAndAct(gems);

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
        await this.prisma.$transaction(async (tx) => {
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

  /**
   * Exécute la surveillance et maintenance du système
   */
  async executeMonitoring(): Promise<CronExecutionResult> {
    const startTime = Date.now();
    const runId = `monitoring-${Date.now()}`;

    try {
      console.log("📊 Démarrage du monitoring de la base de données...");

      // 1. Obtenir les statistiques de taille de la base
      console.log("📏 Calcul de la taille de la base de données...");
      const sizeStats = await DatabaseMonitor.getDatabaseSize();

      // 2. Obtenir les statistiques de santé
      console.log("🩺 Analyse de la santé de la base de données...");
      const healthStats = await DatabaseMonitor.getHealthStats();

      // 3. Déterminer si une alerte est nécessaire
      const needsAlert =
        sizeStats.isNearLimit ||
        healthStats.healthScore < 70 ||
        healthStats.oldGems > 500 ||
        healthStats.oldAlerts > 200;

      // 4. Logs détaillés
      console.log(
        `📊 Taille estimée BD: ${
          sizeStats.estimatedSizeMB
        } MB / 150 MB (${Math.round((sizeStats.estimatedSizeMB / 150) * 100)}%)`
      );
      console.log(`🩺 Score de santé: ${healthStats.healthScore}/100`);
      console.log(`📋 Problèmes détectés: ${healthStats.issues.length}`);

      // Top 3 tables les plus volumineuses
      const topTables = Object.entries(sizeStats.breakdown)
        .sort(([, a], [, b]) => b.sizeMB - a.sizeMB)
        .slice(0, 3);

      console.log("📈 Top 3 tables:");
      topTables.forEach(([table, data], index) => {
        console.log(
          `  ${index + 1}. ${table}: ${data.sizeMB}MB (${data.records} records)`
        );
      });

      // 5. Envoyer notification si nécessaire
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.TELEGRAM_CHAT_ID;

      if (needsAlert && telegramToken && telegramChatId) {
        try {
          const telegramBot = new TelegramBot(telegramToken, telegramChatId);

          const statusEmoji = sizeStats.isNearLimit
            ? "🚨"
            : healthStats.healthScore < 50
            ? "⚠️"
            : "📊";

          const summary = `
${statusEmoji} *Monitoring Base de Données*

💾 *Taille: ${sizeStats.estimatedSizeMB} MB / 150 MB*
Progress: ${"█".repeat(Math.floor(sizeStats.estimatedSizeMB / 15))}${"░".repeat(
            10 - Math.floor(sizeStats.estimatedSizeMB / 15)
          )} ${Math.round((sizeStats.estimatedSizeMB / 150) * 100)}%

🩺 *Santé: ${healthStats.healthScore}/100*

📊 *Top Tables:*
${topTables
  .map(([table, data]) => `• ${table}: ${data.sizeMB}MB (${data.records})`)
  .join("\n")}

${sizeStats.isNearLimit ? "🚨 *ALERTE: Proche de la limite !*" : ""}

🔧 *Actions recommandées:*
${sizeStats.recommendedActions
  .slice(0, 3)
  .map((action) => `• ${action}`)
  .join("\n")}

${
  healthStats.issues.length > 1
    ? `\n⚠️ *Problèmes détectés:*\n${healthStats.issues
        .slice(0, 3)
        .map((issue) => `• ${issue}`)
        .join("\n")}`
    : ""
}
              `.trim();

          await telegramBot.sendMessage(summary);
          console.log("📱 Alerte de monitoring envoyée par Telegram");
        } catch (telegramError) {
          console.error(
            "❌ Erreur lors de l'envoi de l'alerte Telegram:",
            telegramError
          );
        }
      } else if (!needsAlert) {
        console.log("✅ Base de données saine - pas d'alerte nécessaire");
      }

      const duration = Date.now() - startTime;
      console.log("✅ Cron monitoring DB terminé avec succès");
      console.log(
        `📊 Résumé: ${sizeStats.estimatedSizeMB}MB utilisés, ${healthStats.healthScore}/100 santé`
      );

      return {
        success: true,
        timestamp: new Date().toISOString(),
        runId,
        data: {
          sizeStats,
          healthStats,
          alerts: {
            needsAlert,
            isNearLimit: sizeStats.isNearLimit,
            lowHealthScore: healthStats.healthScore < 70,
          },
          recommendations: sizeStats.recommendedActions,
          topTables,
        },
        summary: {
          estimatedSizeMB: sizeStats.estimatedSizeMB,
          healthScore: healthStats.healthScore,
          needsAlert,
        },
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      console.error("❌ Erreur dans le cron monitoring DB:", errorMessage);

      // Envoyer une alerte d'erreur par Telegram
      try {
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatId = process.env.TELEGRAM_CHAT_ID;

        if (telegramToken && telegramChatId) {
          const telegramBot = new TelegramBot(telegramToken, telegramChatId);
          await telegramBot.sendMessage(
            `
🚨 *Erreur Cron Monitoring DB*

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
}
