import { PrismaClient } from "@prisma/client";
import type { CronExecutionResult, CleanupStats } from "./types";

/**
 * Nettoyage des données anciennes
 */
export async function executeCleanup(prisma?: PrismaClient): Promise<CronExecutionResult> {
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

    const db = prisma || new PrismaClient();

    // 1. Nettoyage des alertes anciennes
    const alertsCutoff = new Date(Date.now() - CLEANUP_CONFIG.alertsMaxAge);
    const alertsToDelete = await db.cryptoGemAlert.count({
      where: { createdAt: { lt: alertsCutoff } },
    });

    if (
      alertsToDelete > 0 &&
      alertsToDelete <= CLEANUP_CONFIG.maxAlertsToDelete
    ) {
      const alertsResult = await db.cryptoGemAlert.deleteMany({
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
    const lowScoreDeleted = await db.cryptoGemProject.deleteMany({
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
    const mediumScoreDeleted = await db.cryptoGemProject.deleteMany({
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
    const highScoreDeleted = await db.cryptoGemProject.deleteMany({
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
    const investmentsToDelete = await db.cryptoInvestment.count({
      where: { timestamp: { lt: investmentsCutoff } },
    });

    if (
      investmentsToDelete > 0 &&
      investmentsToDelete <= CLEANUP_CONFIG.maxInvestmentsToDelete
    ) {
      const investmentsResult = await db.cryptoInvestment.deleteMany(
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
      await db.cryptoPortfolioSnapshot.deleteMany({
        where: { timestamp: { lt: portfolioCutoff } },
      });
    stats.portfolioSnapshotsDeleted = portfolioResult.count;

    // 5. Nettoyage des runs de simulation
    const simulationCutoff = new Date(
      Date.now() - CLEANUP_CONFIG.simulationRunsMaxAge
    );
    const simulationResult = await db.cryptoSimulationRun.deleteMany(
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
