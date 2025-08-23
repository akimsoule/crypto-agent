import prisma from '../infrastructure/database/prismaClient';

interface ResetOptions {
  investors?: boolean;
  gems?: boolean;
  portfolios?: boolean;
  all?: boolean;
}

export interface ResetStats {
  investments: number;
  positions: number;
  snapshots: number;
  investors: number;
  gems: number;
  alerts: number;
}

export interface ResetResult {
  success: boolean;
  message?: string;
  stats?: ResetStats;
  error?: string;
}

export class DataResetService {
  constructor() {
    // Utilise l'instance Prisma partagée
  }

  /**
   * Réinitialise les données sélectionnées de la base de données
   * @param options Options de réinitialisation
   */
  async resetData(options: ResetOptions): Promise<ResetResult> {
    try {
      const stats: ResetStats = {
        investments: 0,
        positions: 0,
        snapshots: 0,
        investors: 0,
        gems: 0,
        alerts: 0
      };

      // Validation des options
      if (!options.investors && !options.gems && !options.portfolios && !options.all) {
        return {
          success: false,
          error: "Aucune option de réinitialisation spécifiée"
        };
      }

      // Toujours supprimer les investissements en premier (contrainte de clé étrangère)
      if (options.investors || options.all) {
        const deletedInvestments = await prisma.cryptoInvestment.deleteMany();
        stats.investments = deletedInvestments.count;
        console.log(`✅ ${stats.investments} investissements supprimés`);
      }

      // Supprimer les positions et snapshots (contrainte de clé étrangère)
      if (options.portfolios || options.all) {
        const deletedPositions = await prisma.cryptoPosition.deleteMany();
        stats.positions = deletedPositions.count;
        console.log(`✅ ${stats.positions} positions supprimées`);

        const deletedSnapshots = await prisma.cryptoPortfolioSnapshot.deleteMany();
        stats.snapshots = deletedSnapshots.count;
        console.log(`✅ ${stats.snapshots} snapshots supprimés`);
      }

      // Supprimer les profils d'investisseurs
      if (options.investors || options.all) {
        const deletedInvestors = await prisma.investorProfile.deleteMany();
        stats.investors = deletedInvestors.count;
        console.log(`✅ ${stats.investors} profils d'investisseurs supprimés`);
      }

      // Supprimer les gems
      if (options.gems || options.all) {
        const deletedAlerts = await prisma.cryptoGemAlert.deleteMany();
        stats.alerts = deletedAlerts.count;
        console.log(`✅ ${stats.alerts} alertes supprimées`);

        const deletedGems = await prisma.cryptoGemProject.deleteMany();
        stats.gems = deletedGems.count;
        console.log(`✅ ${stats.gems} projets crypto supprimés`);
      }

      // Réinitialiser l'état du système si nécessaire
      if (options.all) {
        await prisma.cryptoGemState.updateMany({
          data: {
            currentPage: 1,
            processPhase: 'FETCH',
            isProcessing: false,
            lastCycleStart: new Date()
          }
        });
        console.log("✅ État du système réinitialisé");
      }

      return {
        success: true,
        message: 'Réinitialisation terminée avec succès',
        stats
      };
    } catch (error) {
      console.error("❌ Erreur lors de la réinitialisation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Méthode de compatibilité - le client Prisma partagé gère sa propre déconnexion
   */
  async disconnect(): Promise<void> {
    // Pas besoin de déconnexion explicite avec le client partagé
    return Promise.resolve();
  }
}
