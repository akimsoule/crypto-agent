import { InvestorProfileFactory } from "../../../../types/investor";
import prisma from "../../infrastructure/database/prismaClient";

/**
 * Script pour initialiser les profils d'investisseurs par défaut
 * Ce script doit être exécuté une fois pour créer les profils d'investisseurs de base
 */
export async function setupDefaultInvestors() {
  try {
    console.log("🏗️ Configuration des profils d'investisseurs par défaut...");

    // Vérifier si des investisseurs existent déjà
    const existingInvestors = await prisma.investorProfile.count();

    if (existingInvestors > 0) {
      console.log(
        `✅ ${existingInvestors} investisseurs trouvés dans la base de données`
      );
      return {
        success: true,
        message: `${existingInvestors} investisseurs déjà configurés`,
        count: existingInvestors,
      };
    }

    // Créer les profils par défaut
    const defaultProfiles = InvestorProfileFactory.createProfiles();
    console.log(
      `📝 Création de ${defaultProfiles.length} profils d'investisseurs...`
    );

    let createdCount = 0;

    for (const profile of defaultProfiles) {
      try {
        await prisma.investorProfile.create({
          data: profile,
        });
        createdCount++;
        console.log(`✅ Profil créé: ${profile.name} (${profile.type})`);
      } catch (error) {
        console.error(
          `❌ Erreur lors de la création du profil ${profile.name}:`,
          error
        );
      }
    }

    console.log(
      `🎉 Configuration terminée: ${createdCount}/${defaultProfiles.length} profils créés`
    );

    return {
      success: true,
      message: `${createdCount} profils d'investisseurs créés avec succès`,
      count: createdCount,
      profiles: defaultProfiles.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
      })),
    };
  } catch (error) {
    console.error(
      "❌ Erreur lors de la configuration des investisseurs:",
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      count: 0,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Réactiver tous les investisseurs
 */
export async function activateAllInvestors() {
  try {
    const result = await prisma.investorProfile.updateMany({
      data: { isActive: true },
    });

    console.log(`✅ ${result.count} investisseurs réactivés`);
    return {
      success: true,
      message: `${result.count} investisseurs réactivés`,
      count: result.count,
    };
  } catch (error) {
    console.error(
      "❌ Erreur lors de la réactivation des investisseurs:",
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      count: 0,
    };
  }
}

/**
 * Obtenir le statut des investisseurs
 */
export async function getInvestorsStatus() {
  try {
    const total = await prisma.investorProfile.count();
    const active = await prisma.investorProfile.count({
      where: { isActive: true },
    });
    const inactive = total - active;

    const investors = await prisma.investorProfile.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        riskTolerance: true,
        maxPositionSize: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      summary: {
        total,
        active,
        inactive,
      },
      investors,
    };
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du statut:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

// Si le script est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDefaultInvestors()
    .then((result) => {
      console.log("📊 Résultat:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Erreur fatale:", error);
      process.exit(1);
    });
}
