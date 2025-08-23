#!/usr/bin/env ts-node
/**
 * Script de réinitialisation des données
 *
 * Usage:
 * npm run reset:investors - Réinitialise uniquement les investisseurs et leurs investissements
 * npm run reset:gems - Réinitialise uniquement les projets crypto
 * npm run reset:portfolios - Réinitialise uniquement les portfolios
 * npm run reset:all - Réinitialise toutes les données
 *
 * Pour utiliser avec .env.prod:
 * NODE_ENV=production ENV_FILE=.env.prod npm run reset:all
 */

import { PrismaClient } from "@prisma/client";
import chalk from "chalk";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Chargement des variables d'environnement depuis le fichier spécifié
function loadEnvironment() {
  // Vérifier si un fichier d'environnement est spécifié
  const envFile = process.env.ENV_FILE || ".env";

  // Chemin absolu vers le fichier d'environnement
  const envPath = path.resolve(process.cwd(), envFile);

  console.log(
    chalk.blue(`🔍 Chargement du fichier d'environnement: ${envFile}`)
  );

  // Vérifier si le fichier existe
  if (fs.existsSync(envPath)) {
    // Charger les variables d'environnement depuis le fichier spécifié
    const result = dotenv.config({ path: envPath });

    if (result.error) {
      console.error(
        chalk.red(
          `❌ Erreur lors du chargement du fichier d'environnement: ${result.error.message}`
        )
      );
      process.exit(1);
    }

    console.log(
      chalk.green(`✅ Variables d'environnement chargées depuis ${envFile}`)
    );

    // Afficher la base de données utilisée
    if (process.env.DATABASE_URL) {
      // Extraire le nom de la base de données depuis l'URL
      const dbUrl = process.env.DATABASE_URL;
      const dbNameMatch = dbUrl.match(/\/([^/]+)(\?|$)/);
      const dbName = dbNameMatch ? dbNameMatch[1] : "inconnu";

      console.log(chalk.yellow(`⚠️ Base de données cible: ${dbName}`));
    } else {
      console.error(
        chalk.red("❌ DATABASE_URL non définie dans le fichier d'environnement")
      );
      process.exit(1);
    }
  } else {
    console.error(
      chalk.red(`❌ Fichier d'environnement non trouvé: ${envPath}`)
    );
    process.exit(1);
  }
}

// Charger les variables d'environnement
loadEnvironment();

// Initialisation de Prisma
const prisma = new PrismaClient();

interface ResetOptions {
  investors?: boolean;
  gems?: boolean;
  portfolios?: boolean;
  all?: boolean;
}

interface ResetStats {
  investments: number;
  positions: number;
  snapshots: number;
  investors: number;
  gems: number;
  alerts: number;
  [key: string]: number;
}

// Fonction principale
async function resetData(options: ResetOptions): Promise<ResetStats> {
  console.log(chalk.blue("🔄 Démarrage de la réinitialisation des données..."));

  const stats: ResetStats = {
    investments: 0,
    positions: 0,
    snapshots: 0,
    investors: 0,
    gems: 0,
    alerts: 0,
  };

  try {
    // Option "all" activera toutes les autres options
    if (options.all) {
      options.investors = true;
      options.gems = true;
      options.portfolios = true;
    }

    // Validation - au moins une option doit être active
    if (!options.investors && !options.gems && !options.portfolios) {
      console.error(
        chalk.red("❌ Erreur: Aucune option de réinitialisation spécifiée")
      );
      process.exit(1);
    }

    // Réinitialisation des investisseurs et investissements (doivent être supprimés avant les portfolios en raison des contraintes de clé étrangère)
    if (options.investors) {
      console.log(chalk.yellow("🗑️  Suppression des investissements..."));
      const deletedInvestments = await prisma.cryptoInvestment.deleteMany();
      stats.investments = deletedInvestments.count;
      console.log(
        chalk.green(`✅ ${stats.investments} investissements supprimés`)
      );

      console.log(chalk.yellow("🗑️  Suppression des investisseurs..."));
      const deletedInvestors = await prisma.investorProfile.deleteMany();
      stats.investors = deletedInvestors.count;
      console.log(chalk.green(`✅ ${stats.investors} investisseurs supprimés`));
    }

    // Réinitialisation des projets crypto
    if (options.gems) {
      console.log(chalk.yellow("🗑️  Suppression des snapshots..."));
      const deletedSnapshots =
        await prisma.cryptoPortfolioSnapshot.deleteMany();
      stats.snapshots = deletedSnapshots.count;
      console.log(chalk.green(`✅ ${stats.snapshots} snapshots supprimés`));

      console.log(chalk.yellow("🗑️  Suppression des alertes..."));
      const deletedAlerts = await prisma.cryptoGemAlert.deleteMany();
      stats.alerts = deletedAlerts.count;
      console.log(chalk.green(`✅ ${stats.alerts} alertes supprimées`));

      console.log(chalk.yellow("🗑️  Suppression des gems..."));
      const deletedGems = await prisma.cryptoGemProject.deleteMany();
      stats.gems = deletedGems.count;
      console.log(chalk.green(`✅ ${stats.gems} gems supprimés`));
    }

    // Réinitialisation des portfolios
    if (options.portfolios) {
      console.log(chalk.yellow("🗑️  Suppression des positions..."));
      const deletedPositions = await prisma.cryptoPosition.deleteMany();
      stats.positions = deletedPositions.count;
      console.log(chalk.green(`✅ ${stats.positions} positions supprimées`));
    }

    console.log(chalk.blue("✨ Réinitialisation terminée"));

    // Affichage récapitulatif
    console.log(chalk.cyan("\n📊 Récapitulatif des suppressions:"));
    Object.entries(stats).forEach(([key, value]) => {
      if (value > 0) {
        console.log(chalk.cyan(`   - ${key}: ${value}`));
      }
    });

    return stats;
  } catch (error) {
    console.error(
      chalk.red("❌ Erreur lors de la réinitialisation des données:"),
      error
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Traitement des arguments de ligne de commande
function parseArguments(): ResetOptions {
  const options: ResetOptions = {
    investors: false,
    gems: false,
    portfolios: false,
    all: false,
  };

  const args = process.argv.slice(2);

  if (args.includes("--investors") || args.includes("-i")) {
    options.investors = true;
  }

  if (args.includes("--gems") || args.includes("-g")) {
    options.gems = true;
  }

  if (args.includes("--portfolios") || args.includes("-p")) {
    options.portfolios = true;
  }

  if (args.includes("--all") || args.includes("-a")) {
    options.all = true;
  }

  // Si aucune option spécifiée, demander confirmation pour tout réinitialiser
  if (
    !options.investors &&
    !options.gems &&
    !options.portfolios &&
    !options.all
  ) {
    console.log(
      chalk.yellow(
        "⚠️  Aucune option spécifiée. Utilisation de --all par défaut."
      )
    );
    options.all = true;
  }

  return options;
}

// Fonction principale
async function main() {
  console.log(chalk.bold("🔄 Script de réinitialisation des données"));

  // Analyse des arguments
  const options = parseArguments();

  // Affichage des options sélectionnées
  console.log(chalk.cyan("\nOptions sélectionnées:"));
  console.log(
    chalk.cyan(
      `  Investisseurs: ${options.investors || options.all ? "✅" : "❌"}`
    )
  );
  console.log(
    chalk.cyan(`  Projets Crypto: ${options.gems || options.all ? "✅" : "❌"}`)
  );
  console.log(
    chalk.cyan(
      `  Portfolios: ${options.portfolios || options.all ? "✅" : "❌"}`
    )
  );

  // Confirmation
  if (process.env.NODE_ENV !== "test") {
    console.log(
      chalk.yellow("\n⚠️  ATTENTION: Cette opération est irréversible!")
    );
    console.log(
      chalk.yellow(
        "Appuyez sur Ctrl+C pour annuler ou attendez 5 secondes pour continuer..."
      )
    );

    // Attente de 5 secondes avant de continuer
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Exécution de la réinitialisation
  await resetData(options);
}

main().catch((error) => {
  console.error(chalk.red("❌ Erreur fatale:"), error);
  process.exit(1);
});

// Export pour les tests ou l'utilisation en tant que module
export { resetData, ResetOptions, ResetStats };
