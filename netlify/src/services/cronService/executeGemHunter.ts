import { CryptoGemHunter } from "../../domain/crypto/cryptoGemHunter";
import SocialMediaManager from "../../infrastructure/external/socialMediaManager";
import type { CronExecutionResult } from "./types";

/**
 * Exécute la tâche de recherche de gems crypto
 */
export async function executeGemHunter(): Promise<CronExecutionResult> {
  const startTime = Date.now();
  const runId = `gem-hunter-${startTime}`;

  try {
    console.log("🚀 Lancement de l'analyse complète des gems...");

    const gemHunter = new CryptoGemHunter();
    const socialManager = new SocialMediaManager({
      autoPost: true,
      gemScoreThreshold: 80, // Seuil plus élevé pour les publications automatiques
      priceChangeThreshold: 25,
    });

    // Exécuter le cycle complet d'analyse
    const result = await gemHunter.run();

    console.log("📊 Résultat de l'analyse:", {
      success: result.success,
      statusCode: result.statusCode,
      gemsFound: result.data?.totalGemsFound || 0,
      alertsGenerated: result.data?.alerts?.length || 0,
      message: result.message,
    });

    // Si des gems exceptionnelles sont trouvées, les publier sur Facebook
    if (result.success && result.data?.gems && result.data.gems.length > 0) {
      console.log("📱 Vérification des gems pour publication Facebook...");

      // Vérifier les alertes urgentes (gains > 50%)
      await socialManager.checkForUrgentAlerts();

      // Publier les meilleures gems trouvées
      await socialManager.autoPostToFacebook("gems");
    }

    const duration = Date.now() - startTime;

    return {
      success: result.success,
      timestamp: new Date().toISOString(),
      runId,
      data: result.data,
      summary: {
        gemsFound: result.data?.totalGemsFound || 0,
        alertsGenerated: result.data?.alerts?.length || 0,
      },
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue";

    console.error("❌ Erreur dans le cron gem-hunter:", errorMessage);

    return {
      success: false,
      timestamp: new Date().toISOString(),
      runId,
      error: errorMessage,
      duration,
    };
  }
}
