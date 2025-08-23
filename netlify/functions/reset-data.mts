import type { Context } from "@netlify/functions";
import { withDashboardAuth } from "./middleware/dashBoardMiddleware.mts";
import { DataResetService } from "../src/services/DataResetService";

/**
 * Endpoint pour réinitialiser les données des investisseurs et des gems
 * Version optimisée pour Netlify Functions
 */
export const handler = async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }
  
  try {
    const url = new URL(req.url);
    const options = {
      investors: url.searchParams.get('investors') === 'true',
      gems: url.searchParams.get('gems') === 'true',
      portfolios: url.searchParams.get('portfolios') === 'true', 
      all: url.searchParams.get('all') === 'true'
    };

    if (!options.investors && !options.gems && !options.portfolios && !options.all) {
      return new Response(
        JSON.stringify({ 
          error: "Aucune action spécifiée. Utilisez investors=true, gems=true, portfolios=true ou all=true" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const service = new DataResetService();
    const result = await service.resetData(options);

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message || (result.error || 'Opération terminée'),
        details: {
          ...(result.stats || {}),
          ...options,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: result.success ? 200 : 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("❌ Erreur:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export default withDashboardAuth(handler);
