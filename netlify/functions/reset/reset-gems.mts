import type { Context } from "@netlify/functions";
import { withDashboardAuth } from "../middleware/dashBoardMiddleware.mts";
import { GemResetService } from "../../src/services/reset/GemResetService";

/**
 * Fonction Netlify dédiée à la réinitialisation des gems
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
    const resetState = url.searchParams.get('resetState') === 'true';
    
    const service = new GemResetService();
    const result = await service.resetGems();
    
    if (resetState) {
      await service.resetGemState();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Réinitialisation des gems terminée',
        details: {
          ...result,
          stateReset: resetState,
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
