import { InvestorResetService } from './InvestorResetService';
import { GemResetService } from './GemResetService';
import { PortfolioResetService } from './PortfolioResetService';

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
 * Orchestrateur qui coordonne les services de réinitialisation individuels
 */
export class ResetOrchestrator {
  private investorService: InvestorResetService;
  private gemService: GemResetService;
  private portfolioService: PortfolioResetService;

  constructor() {
    this.investorService = new InvestorResetService();
    this.gemService = new GemResetService();
    this.portfolioService = new PortfolioResetService();
  }

  /**
   * Réinitialise les données en fonction des options spécifiées
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

      // Réinitialisation des investisseurs
      if (options.investors || options.all) {
        const investorStats = await this.investorService.resetInvestors();
        stats.investments = investorStats.investments;
        stats.investors = investorStats.investors;
      }

      // Réinitialisation des portfolios
      if (options.portfolios || options.all) {
        const portfolioStats = await this.portfolioService.resetPortfolios();
        stats.positions = portfolioStats.positions;
        stats.snapshots = portfolioStats.snapshots;
      }

      // Réinitialisation des gems
      if (options.gems || options.all) {
        const gemStats = await this.gemService.resetGems();
        stats.gems = gemStats.gems;
        stats.alerts = gemStats.alerts;
      }

      // Réinitialisation de l'état du système
      if (options.all) {
        await this.gemService.resetGemState();
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
}
