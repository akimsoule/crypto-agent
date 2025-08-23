import type { Context } from "@netlify/functions";
import { PrismaClient } from '@prisma/client';
import { withDashboardAuth } from "./middleware/dashBoardMiddleware.mts";

const prisma = new PrismaClient();

/**
 * Endpoint pour réinitialiser les données des investisseurs et des gems
 * 
 * Paramètres d'URL:
 * - investors=true|false : Réinitialiser les données des investisseurs
 * - gems=true|false : Réinitialiser les données des gems
 * - portfolios=true|false : Réinitialiser les portfolios
 * - all=true : Réinitialiser toutes les données
 */
export const handler = async (req: Request, context: Context) => {
  console.log("🗑️ Fonction de réinitialisation de données appelée");

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const resetInvestors = url.searchParams.get('investors') === 'true';
    const resetGems = url.searchParams.get('gems') === 'true';
    const resetPortfolios = url.searchParams.get('portfolios') === 'true';
    const resetAll = url.searchParams.get('all') === 'true';

    if (!resetInvestors && !resetGems && !resetPortfolios && !resetAll) {
      return new Response(
        JSON.stringify({ 
          error: "Aucune action spécifiée. Utilisez investors=true, gems=true, portfolios=true ou all=true" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const stats = {
      investments: 0,
      positions: 0,
      snapshots: 0,
      investors: 0,
      gems: 0,
      alerts: 0
    };

    // Toujours supprimer les investissements en premier (contrainte de clé étrangère)
    if (resetInvestors || resetAll) {
      const deletedInvestments = await prisma.cryptoInvestment.deleteMany();
      stats.investments = deletedInvestments.count;
      console.log(`✅ ${stats.investments} investissements supprimés`);
    }

    // Supprimer les positions et snapshots (contrainte de clé étrangère)
    if (resetPortfolios || resetAll) {
      const deletedPositions = await prisma.cryptoPosition.deleteMany();
      stats.positions = deletedPositions.count;
      console.log(`✅ ${stats.positions} positions supprimées`);

      const deletedSnapshots = await prisma.cryptoPortfolioSnapshot.deleteMany();
      stats.snapshots = deletedSnapshots.count;
      console.log(`✅ ${stats.snapshots} snapshots supprimés`);
    }

    // Supprimer les profils d'investisseurs
    if (resetInvestors || resetAll) {
      const deletedInvestors = await prisma.investorProfile.deleteMany();
      stats.investors = deletedInvestors.count;
      console.log(`✅ ${stats.investors} profils d'investisseurs supprimés`);
    }

    // Supprimer les gems
    if (resetGems || resetAll) {
      const deletedAlerts = await prisma.cryptoGemAlert.deleteMany();
      stats.alerts = deletedAlerts.count;
      console.log(`✅ ${stats.alerts} alertes supprimées`);

      const deletedGems = await prisma.cryptoGemProject.deleteMany();
      stats.gems = deletedGems.count;
      console.log(`✅ ${stats.gems} projets crypto supprimés`);
    }

    // Réinitialiser l'état du système si nécessaire
    if (resetAll) {
      await prisma.cryptoGemState.updateMany({
        data: {
          currentPage: 1,
          processPhase: 'FETCH',
          isProcessing: false,
          lastCycleStart: new Date()
        }
      });
      console.log("✅ État du système réinitialisé");
    }

    const result = {
      success: true,
      message: 'Réinitialisation terminée avec succès',
      details: {
        ...stats,
        resetInvestors,
        resetGems,
        resetPortfolios,
        resetAll,
        timestamp: new Date().toISOString()
      }
    };

    console.log("🎉 Réinitialisation terminée:", result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } finally {
    await prisma.$disconnect();
  }
};

export default withDashboardAuth(handler);
