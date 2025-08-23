import type { Context } from "@netlify/functions";
import { withDashboardAuth } from "../middleware/dashBoardMiddleware.mts";
import { PortfolioResetService } from "../../src/services/reset/PortfolioResetService";

/**
 * Fonction Netlify dédiée à la réinitialisation des portfolios
 */
export const handler = async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }
  
  try {
    const service = new PortfolioResetService();
    const result = await service.resetPortfolios();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Réinitialisation des portfolios terminée',
        details: {
          ...result,
          timestamp: new Date().toISOString()
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
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
