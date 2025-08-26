import type { Config } from "@netlify/functions";
import { CronService } from "../src/services";

export default async (req: Request) => {
  try {
    const { next_run } = await req.json();

    console.log(
      "🚀 Démarrage du cron investor-watch. Prochaine exécution:",
      next_run
    );

    const cronService = new CronService();
    const result = await cronService.executeInvestorWatch();

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: "Surveillance des investisseurs terminée avec succès",
        data: {
          runId: result.runId,
          timestamp: result.timestamp,
          duration: result.duration,
          summary: result.summary,
          results: result.data,
          next_run
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: "Erreur lors de la surveillance des investisseurs",
        error: result.error,
        runId: result.runId,
        timestamp: result.timestamp,
        duration: result.duration,
        next_run
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error("❌ Erreur critique dans le cron investor-watch:", errorMessage);

    return new Response(JSON.stringify({
      success: false,
      message: "Erreur critique lors de l'exécution du cron",
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config: Config = {
  schedule: "*/15 * * * *", // Toutes les 15 mins
};
