import type { Context } from "@netlify/functions";
import { withDashboardAuth } from "./middleware/dashBoardMiddleware.mts";
import { DataResetService } from "../src/services/DataResetService";

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

  const dataResetService = new DataResetService();
  
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

    const resetResult = await dataResetService.resetData({
      investors: resetInvestors,
      gems: resetGems,
      portfolios: resetPortfolios,
      all: resetAll
    });

    if (!resetResult.success) {
      throw new Error(resetResult.error || 'Erreur inconnue lors de la réinitialisation');
    }

    const result = {
      success: true,
      message: resetResult.message || 'Réinitialisation terminée avec succès',
      details: {
        ...(resetResult.stats || {}),
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
    await dataResetService.disconnect();
  }
};

export default withDashboardAuth(handler);
