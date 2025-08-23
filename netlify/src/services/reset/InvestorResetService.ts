import prisma from '../../infrastructure/database/prismaClient';

/**
 * Service dédié à la réinitialisation des investisseurs et de leurs investissements
 */
export class InvestorResetService {
  /**
   * Supprime tous les investisseurs et leurs investissements
   * @returns Nombre d'éléments supprimés
   */
  async resetInvestors(): Promise<{ investments: number; investors: number }> {
    try {
      // Supprimer d'abord les investissements (contrainte de clé étrangère)
      const deletedInvestments = await prisma.cryptoInvestment.deleteMany();
      console.log(`✅ ${deletedInvestments.count} investissements supprimés`);
      
      // Supprimer ensuite les profils d'investisseurs
      const deletedInvestors = await prisma.investorProfile.deleteMany();
      console.log(`✅ ${deletedInvestors.count} profils d'investisseurs supprimés`);
      
      return {
        investments: deletedInvestments.count,
        investors: deletedInvestors.count
      };
    } catch (error) {
      console.error("❌ Erreur lors de la réinitialisation des investisseurs:", error);
      throw error;
    }
  }
}
