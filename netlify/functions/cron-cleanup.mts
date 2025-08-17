import type { Config } from "@netlify/functions";
import { CronService } from "../src/services";

export default async (req: Request) => {
  try {
    const { next_run } = await req.json();

    console.log(
      "🧹 Démarrage du cron cleanup. Prochaine exécution:",
      next_run
    );

    const cronService = new CronService();
    const result = await cronService.executeCleanup();

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: "Nettoyage terminé avec succès",
        data: {
          runId: result.runId,
          timestamp: result.timestamp,
          duration: result.duration,
          summary: result.summary,
          stats: result.data,
          next_run
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: "Erreur lors du nettoyage",
        error: result.error,
        runId: result.runId,
        timestamp: result.timestamp,
        duration: result.duration,
        partialStats: result.data,
        next_run
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error("❌ Erreur critique dans le cron cleanup:", errorMessage);

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
  schedule: "0 2 * * *", // Tous les jours à 2h du matin
};
