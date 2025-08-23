import prisma from '../../infrastructure/database/prismaClient';

/**
 * Service dédié à la réinitialisation des portfolios
 */
export class PortfolioResetService {
  /**
   * Supprime toutes les positions et snapshots de portfolios
   * @returns Nombre d'éléments supprimés
   */
  async resetPortfolios(): Promise<{ positions: number; snapshots: number }> {
    try {
      // Supprimer les positions
      const deletedPositions = await prisma.cryptoPosition.deleteMany();
      console.log(`✅ ${deletedPositions.count} positions supprimées`);
      
      // Supprimer les snapshots
      const deletedSnapshots = await prisma.cryptoPortfolioSnapshot.deleteMany();
      console.log(`✅ ${deletedSnapshots.count} snapshots supprimés`);
      
      return {
        positions: deletedPositions.count,
        snapshots: deletedSnapshots.count
      };
    } catch (error) {
      console.error("❌ Erreur lors de la réinitialisation des portfolios:", error);
      throw error;
    }
  }
}
