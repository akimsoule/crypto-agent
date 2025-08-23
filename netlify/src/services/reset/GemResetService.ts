import prisma from '../../infrastructure/database/prismaClient';

/**
 * Service dédié à la réinitialisation des projets crypto (gems)
 */
export class GemResetService {
  /**
   * Supprime tous les projets crypto et leurs alertes
   * @returns Nombre d'éléments supprimés
   */
  async resetGems(): Promise<{ gems: number; alerts: number }> {
    try {
      // Supprimer d'abord les alertes (contrainte de clé étrangère)
      const deletedAlerts = await prisma.cryptoGemAlert.deleteMany();
      console.log(`✅ ${deletedAlerts.count} alertes supprimées`);
      
      // Supprimer ensuite les projets crypto
      const deletedGems = await prisma.cryptoGemProject.deleteMany();
      console.log(`✅ ${deletedGems.count} projets crypto supprimés`);
      
      return {
        alerts: deletedAlerts.count,
        gems: deletedGems.count
      };
    } catch (error) {
      console.error("❌ Erreur lors de la réinitialisation des gems:", error);
      throw error;
    }
  }
  
  /**
   * Réinitialise l'état du système de suivi des gems
   */
  async resetGemState(): Promise<void> {
    try {
      await prisma.cryptoGemState.updateMany({
        data: {
          currentPage: 1,
          processPhase: 'FETCH',
          isProcessing: false,
          lastCycleStart: new Date()
        }
      });
      console.log("✅ État du système réinitialisé");
    } catch (error) {
      console.error("❌ Erreur lors de la réinitialisation de l'état du système:", error);
      throw error;
    }
  }
}
