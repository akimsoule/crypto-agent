import prisma from "../database/prismaClient";


// Utilitaire pour monitorer la taille et santé de la base de données
export class DatabaseMonitor {
  // Estimer la taille approximative de la base de données
  static async getDatabaseSize(): Promise<{
    totalRecords: number;
    estimatedSizeMB: number;
    breakdown: Record<
      string,
      { records: number; sizeMB: number; percentage: number }
    >;
    isNearLimit: boolean;
    recommendedActions: string[];
  }> {
    try {
      const [
        totalProjects,
        totalAlerts,
        totalInvestments,
        totalPortfolioSnapshots,
        totalSimulationRuns,
        totalInvestorProfiles,
      ] = await Promise.all([
        prisma.cryptoGemProject.count(),
        prisma.cryptoGemAlert.count(),
        prisma.cryptoInvestment.count(),
        prisma.cryptoPortfolioSnapshot.count(),
        prisma.cryptoSimulationRun.count(),
        prisma.investorProfile.count(),
      ]);

      // Estimation basée sur la taille moyenne des enregistrements
      const estimations = {
        cryptoGemProject: { records: totalProjects, avgSizeKB: 2.5 },
        cryptoGemAlert: { records: totalAlerts, avgSizeKB: 0.8 },
        cryptoInvestment: { records: totalInvestments, avgSizeKB: 1.2 },
        cryptoPortfolioSnapshot: {
          records: totalPortfolioSnapshots,
          avgSizeKB: 3.0,
        },
        cryptoSimulationRun: { records: totalSimulationRuns, avgSizeKB: 2.0 },
        investorProfile: { records: totalInvestorProfiles, avgSizeKB: 1.5 },
      };

      const breakdown: Record<
        string,
        { records: number; sizeMB: number; percentage: number }
      > = {};
      let totalEstimatedSizeMB = 0;

      // Calculer la taille estimée pour chaque table
      for (const [table, data] of Object.entries(estimations)) {
        const sizeMB = (data.records * data.avgSizeKB) / 1024;
        totalEstimatedSizeMB += sizeMB;
        breakdown[table] = {
          records: data.records,
          sizeMB: Math.round(sizeMB * 100) / 100,
          percentage: 0, // Sera calculé après
        };
      }

      // Calculer les pourcentages
      for (const table of Object.keys(breakdown)) {
        breakdown[table].percentage = Math.round(
          (breakdown[table].sizeMB / totalEstimatedSizeMB) * 100
        );
      }

      const totalRecords = Object.values(estimations).reduce(
        (sum, data) => sum + data.records,
        0
      );
      const isNearLimit = totalEstimatedSizeMB > 120; // 120 MB = seuil d'alerte (80% de 150MB)

      // Recommandations basées sur l'état actuel
      const recommendedActions: string[] = [];

      if (isNearLimit) {
        recommendedActions.push(
          "🚨 Proche de la limite ! Exécuter le nettoyage immédiatement"
        );
      }

      if (breakdown.cryptoGemProject.records > 3000) {
        recommendedActions.push("🗑️ Nettoyer les gems avec score < 30");
      }

      if (breakdown.cryptoGemAlert.records > 200) {
        recommendedActions.push(
          "⚠️ Trop d'alertes - nettoyer les alertes > 24h"
        );
      }

      if (breakdown.cryptoInvestment.records > 10000) {
        recommendedActions.push("💰 Archiver les investissements > 3 mois");
      }

      if (recommendedActions.length === 0) {
        recommendedActions.push(
          "✅ Base de données saine - pas d'action nécessaire"
        );
      }

      return {
        totalRecords,
        estimatedSizeMB: Math.round(totalEstimatedSizeMB * 100) / 100,
        breakdown,
        isNearLimit,
        recommendedActions,
      };
    } catch (error) {
      console.error("Erreur lors du calcul de la taille de la BD:", error);
      return {
        totalRecords: 0,
        estimatedSizeMB: 0,
        breakdown: {},
        isNearLimit: false,
        recommendedActions: [
          "❌ Erreur lors de l'analyse - vérifier la connexion DB",
        ],
      };
    }
  }

  // Obtenir les statistiques de santé générale
  static async getHealthStats(): Promise<{
    oldGems: number;
    oldAlerts: number;
    oldInvestments: number;
    duplicateGems: number;
    gemsNeedingSentimentAnalysis: number;
    healthScore: number;
    issues: string[];
  }> {
    try {
      const now = Date.now();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const threeMonthsAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

      const [
        oldGems,
        oldAlerts,
        oldInvestments,
        gemsNeedingSentimentAnalysis,
        totalGems,
      ] = await Promise.all([
        prisma.cryptoGemProject.count({
          where: {
            AND: [
              { lastUpdated: { lt: oneWeekAgo } },
              { gemScore: { lt: 30 } },
            ],
          },
        }),
        prisma.cryptoGemAlert.count({
          where: { createdAt: { lt: oneDayAgo } },
        }),
        prisma.cryptoInvestment.count({
          where: { timestamp: { lt: threeMonthsAgo } },
        }),
        prisma.cryptoGemProject.count({
          where: { needsSentimentAnalysis: true },
        }),
        prisma.cryptoGemProject.count(),
      ]);

      // Estimation des doublons (basée sur les gems avec même symbol)
      const duplicateGems = await prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) as count FROM (
                    SELECT symbol 
                    FROM crypto_gem_projects 
                    GROUP BY symbol 
                    HAVING COUNT(*) > 1
                ) as duplicates
            `;

      const duplicateCount = Number(duplicateGems[0]?.count || 0);

      // Calculer le score de santé (0-100)
      let healthScore = 100;

      // Pénalités
      if (oldGems > 0) healthScore -= Math.min(oldGems * 2, 30);
      if (oldAlerts > 0) healthScore -= Math.min(oldAlerts * 0.5, 20);
      if (oldInvestments > 0) healthScore -= Math.min(oldInvestments * 0.1, 20);
      if (duplicateCount > 0) healthScore -= Math.min(duplicateCount * 5, 20);
      if (gemsNeedingSentimentAnalysis > totalGems * 0.3) healthScore -= 10;

      healthScore = Math.max(0, Math.round(healthScore));

      const issues: string[] = [];
      if (oldGems > 100) issues.push(`${oldGems} gems obsolètes à nettoyer`);
      if (oldAlerts > 50) issues.push(`${oldAlerts} alertes anciennes`);
      if (oldInvestments > 1000)
        issues.push(`${oldInvestments} investissements anciens`);
      if (duplicateCount > 10) issues.push(`${duplicateCount} gems dupliqués`);
      if (gemsNeedingSentimentAnalysis > totalGems * 0.5)
        issues.push(
          `${gemsNeedingSentimentAnalysis} gems nécessitent une analyse sentiment`
        );

      if (issues.length === 0) {
        issues.push("✅ Aucun problème détecté");
      }

      return {
        oldGems,
        oldAlerts,
        oldInvestments,
        duplicateGems: duplicateCount,
        gemsNeedingSentimentAnalysis,
        healthScore,
        issues,
      };
    } catch (error) {
      console.error("Erreur lors du calcul des stats de santé:", error);
      return {
        oldGems: 0,
        oldAlerts: 0,
        oldInvestments: 0,
        duplicateGems: 0,
        gemsNeedingSentimentAnalysis: 0,
        healthScore: 0,
        issues: ["❌ Erreur lors de l'analyse de santé"],
      };
    }
  }
}
