import { PrismaClient } from "@prisma/client";
import { TelegramBot } from "../../infrastructure/external/teleg";
import { DatabaseMonitor } from "../../infrastructure/monitoring/databaseMonitor";
import type { CronExecutionResult } from "./types";

/**
 * Exécute la surveillance et maintenance du système
 */
export async function executeMonitoring(_prisma?: PrismaClient): Promise<CronExecutionResult> {
  const startTime = Date.now();
  const runId = `monitoring-${Date.now()}`;

  try {
    console.log("📊 Démarrage du monitoring de la base de données...");

    // 1. Obtenir les statistiques de taille de la base
    console.log("📏 Calcul de la taille de la base de données...");
    const sizeStats = await DatabaseMonitor.getDatabaseSize();

    // 2. Obtenir les statistiques de santé
    console.log("🩺 Analyse de la santé de la base de données...");
    const healthStats = await DatabaseMonitor.getHealthStats();

    // 3. Déterminer si une alerte est nécessaire
    const needsAlert =
      sizeStats.isNearLimit ||
      healthStats.healthScore < 70 ||
      healthStats.oldGems > 500 ||
      healthStats.oldAlerts > 200;

    // 4. Logs détaillés
    console.log(
      `📊 Taille estimée BD: ${
        sizeStats.estimatedSizeMB
      } MB / 150 MB (${Math.round((sizeStats.estimatedSizeMB / 150) * 100)}%)`
    );
    console.log(`🩺 Score de santé: ${healthStats.healthScore}/100`);
    console.log(`📋 Problèmes détectés: ${healthStats.issues.length}`);

    // Top 3 tables les plus volumineuses
    const topTables = Object.entries(sizeStats.breakdown)
      .sort(([, a], [, b]) => b.sizeMB - a.sizeMB)
      .slice(0, 3);

    console.log("📈 Top 3 tables:");
    topTables.forEach(([table, data], index) => {
      console.log(
        `  ${index + 1}. ${table}: ${data.sizeMB}MB (${data.records} records)`
      );
    });

    // 5. Envoyer notification si nécessaire
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (needsAlert && telegramToken && telegramChatId) {
      try {
        const telegramBot = new TelegramBot(telegramToken, telegramChatId);

        const statusEmoji = sizeStats.isNearLimit
          ? "🚨"
          : healthStats.healthScore < 50
          ? "⚠️"
          : "📊";

        const summary = `
${statusEmoji} *Monitoring Base de Données*

💾 *Taille: ${sizeStats.estimatedSizeMB} MB / 150 MB*
Progress: ${"█".repeat(Math.floor(sizeStats.estimatedSizeMB / 15))}${"░".repeat(
          10 - Math.floor(sizeStats.estimatedSizeMB / 15)
        )} ${Math.round((sizeStats.estimatedSizeMB / 150) * 100)}%

🩺 *Santé: ${healthStats.healthScore}/100*

📊 *Top Tables:*
${topTables
  .map(([table, data]) => `• ${table}: ${data.sizeMB}MB (${data.records})`)
  .join("\n")}

${sizeStats.isNearLimit ? "🚨 *ALERTE: Proche de la limite !*" : ""}

🔧 *Actions recommandées:*
${sizeStats.recommendedActions
  .slice(0, 3)
  .map((action) => `• ${action}`)
  .join("\n")}

${
  healthStats.issues.length > 1
    ? `\n⚠️ *Problèmes détectés:*\n${healthStats.issues
        .slice(0, 3)
        .map((issue) => `• ${issue}`)
        .join("\n")}`
    : ""
}
          `.trim();

        await telegramBot.sendMessage(summary);
        console.log("📱 Alerte de monitoring envoyée par Telegram");
      } catch (telegramError) {
        console.error(
          "❌ Erreur lors de l'envoi de l'alerte Telegram:",
          telegramError
        );
      }
    } else if (!needsAlert) {
      console.log("✅ Base de données saine - pas d'alerte nécessaire");
    }

    const duration = Date.now() - startTime;
    console.log("✅ Cron monitoring DB terminé avec succès");
    console.log(
      `📊 Résumé: ${sizeStats.estimatedSizeMB}MB utilisés, ${healthStats.healthScore}/100 santé`
    );

    return {
      success: true,
      timestamp: new Date().toISOString(),
      runId,
      data: {
        sizeStats,
        healthStats,
        alerts: {
          needsAlert,
          isNearLimit: sizeStats.isNearLimit,
          lowHealthScore: healthStats.healthScore < 70,
        },
        recommendations: sizeStats.recommendedActions,
        topTables,
      },
      summary: {
        estimatedSizeMB: sizeStats.estimatedSizeMB,
        healthScore: healthStats.healthScore,
        needsAlert,
      },
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue";
    console.error("❌ Erreur dans le cron monitoring DB:", errorMessage);

    // Envoyer une alerte d'erreur par Telegram
    try {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.TELEGRAM_CHAT_ID;

      if (telegramToken && telegramChatId) {
        const telegramBot = new TelegramBot(telegramToken, telegramChatId);
        await telegramBot.sendMessage(
          `
🚨 *Erreur Cron Monitoring DB*

${errorMessage}

⏰ Timestamp: ${new Date().toISOString()}
      `.trim()
        );
      }
    } catch (telegramError) {
      console.error(
        "❌ Erreur lors de l'envoi de l'alerte Telegram:",
        telegramError
      );
    }

    return {
      success: false,
      timestamp: new Date().toISOString(),
      runId,
      error: errorMessage,
      duration,
    };
  }
}
