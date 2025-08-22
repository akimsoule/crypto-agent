import SocialMediaManager from "../../infrastructure/external/socialMediaManager";
import type { CronExecutionResult } from "./types";

/**
 * Exécute l'envoi de posts Facebook
 */
export async function executeFacebookPosts(): Promise<CronExecutionResult> {
  const startTime = Date.now();
  const runId = `facebook-posts-${startTime}`;

  try {
    console.log("📱 Démarrage de la publication automatique Facebook...");

    const socialManager = new SocialMediaManager({
      autoPost: true,
      gemScoreThreshold: 80,
      priceChangeThreshold: 25,
    });

    const results = await Promise.all([
      socialManager.autoPostToFacebook("gems"),
      socialManager.autoPostToFacebook("performance"),
    ]);

    // Exécuter checkForUrgentAlerts séparément car elle ne retourne pas le même type
    await socialManager.checkForUrgentAlerts();

    const postsCreated = results.filter((r) => r && r.success).length;
    const duration = Date.now() - startTime;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      runId,
      summary: {
        postsCreated,
      },
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue";

    console.error("❌ Erreur dans le cron facebook-posts:", errorMessage);

    return {
      success: false,
      timestamp: new Date().toISOString(),
      runId,
      error: errorMessage,
      duration,
    };
  }
}
