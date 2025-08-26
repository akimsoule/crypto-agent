import type { Config } from "@netlify/functions";
import { CronService } from "../src/services";

export default async (req: Request) => {
  try {
    const { next_run } = await req.json();

    console.log(
      "📧 Démarrage du cron newsletter. Prochaine exécution:",
      next_run
    );

    const cronService = new CronService();
    const result = await cronService.executeNewsletter();

    return new Response(JSON.stringify({
      success: result.success,
      message: result.success ? "Envoi de newsletter terminé avec succès" : "Erreur lors de l'envoi de newsletter",
      data: {
        runId: result.runId,
        timestamp: result.timestamp,
        duration: result.duration,
        summary: result.summary,
        next_run
      },
      ...(result.error && { error: result.error })
    }), {
      status: result.success ? 200 : 500,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error("❌ Erreur critique dans le cron newsletter:", errorMessage);

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
  schedule: "0 9 * * 1", // Tous les lundis à 9h
};
