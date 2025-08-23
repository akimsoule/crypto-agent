import { Pool } from 'pg';

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

/**
 * Version légère du service DataReset utilisant directement pg
 * Cette implémentation évite l'utilisation de Prisma pour réduire la taille de la fonction
 */
export class DataResetServicePg {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
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
        const result = await this.pool.query('DELETE FROM "CryptoInvestment"');
        stats.investments = result.rowCount || 0;
        console.log(`✅ ${stats.investments} investissements supprimés`);
      }

      // Supprimer les positions et snapshots (contrainte de clé étrangère)
      if (options.portfolios || options.all) {
        const posResult = await this.pool.query('DELETE FROM "CryptoPosition"');
        stats.positions = posResult.rowCount || 0;
        console.log(`✅ ${stats.positions} positions supprimées`);

        const snapResult = await this.pool.query('DELETE FROM "CryptoPortfolioSnapshot"');
        stats.snapshots = snapResult.rowCount || 0;
        console.log(`✅ ${stats.snapshots} snapshots supprimés`);
      }

      // Supprimer les profils d'investisseurs
      if (options.investors || options.all) {
        const invResult = await this.pool.query('DELETE FROM "InvestorProfile"');
        stats.investors = invResult.rowCount || 0;
        console.log(`✅ ${stats.investors} profils d'investisseurs supprimés`);
      }

      // Supprimer les gems
      if (options.gems || options.all) {
        const alertResult = await this.pool.query('DELETE FROM "CryptoGemAlert"');
        stats.alerts = alertResult.rowCount || 0;
        console.log(`✅ ${stats.alerts} alertes supprimées`);

        const gemResult = await this.pool.query('DELETE FROM "CryptoGemProject"');
        stats.gems = gemResult.rowCount || 0;
        console.log(`✅ ${stats.gems} projets crypto supprimés`);
      }

      // Réinitialiser l'état du système si nécessaire
      if (options.all) {
        await this.pool.query(`
          UPDATE "CryptoGemState" 
          SET "currentPage" = 1, 
              "processPhase" = 'FETCH', 
              "isProcessing" = false, 
              "lastCycleStart" = NOW()
        `);
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
    } finally {
      // Fermer la connexion
      await this.disconnect();
    }
  }

  /**
   * Ferme la connexion à la base de données
   */
  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
    } catch (error) {
      console.error("❌ Erreur lors de la déconnexion:", error);
    }
  }
}
