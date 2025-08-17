import { PrismaClient, InvestorProfile, CryptoInvestment, CryptoPortfolioSnapshot } from '@prisma/client';

type InvestorWithDetails = InvestorProfile & {
  investments: CryptoInvestment[];
  portfolioSnapshots: CryptoPortfolioSnapshot[];
};

interface GetInvestorsResult {
  success: boolean;
  data?: InvestorWithDetails[];
  error?: string;
}

interface GetInvestorDetailResult {
  success: boolean;
  data?: InvestorWithDetails;
  error?: string;
}

interface PortfolioData {
  totalValue: number;
  holdings: Record<string, unknown>;
}

interface InvestmentData {
  symbol: string;
  amount: number;
  price: number;
  type: string;
}

interface InvestorStats {
  totalInvestors: number;
  totalInvestments: number;
  totalPortfolioValue: number;
  averagePortfolioValue: number;
}

export class InvestorService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Récupère tous les investisseurs actifs avec leurs détails
   */
  async getInvestors(): Promise<GetInvestorsResult> {
    try {
      const investors = await this.prisma.investorProfile.findMany({
        where: { isActive: true },
        include: {
          investments: {
            orderBy: { timestamp: 'desc' },
            take: 5,
          },
          portfolioSnapshots: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      return {
        success: true,
        data: investors,
      };

    } catch (error) {
      console.error('Erreur lors de la récupération des investisseurs:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des investisseurs',
      };
    }
  }

  /**
   * Récupère les détails d'un investisseur spécifique
   */
  async getInvestorDetail(investorId: string): Promise<GetInvestorDetailResult> {
    try {
      const investor = await this.prisma.investorProfile.findUnique({
        where: { id: investorId },
        include: {
          investments: {
            orderBy: { timestamp: 'desc' },
          },
          portfolioSnapshots: {
            orderBy: { timestamp: 'desc' },
            take: 10,
          },
        },
      });

      if (!investor) {
        return {
          success: false,
          error: 'Investisseur non trouvé',
        };
      }

      return {
        success: true,
        data: investor,
      };

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'investisseur:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération de l\'investisseur',
      };
    }
  }

  /**
   * Met à jour le portefeuille d'un investisseur
   */
  async updateInvestorPortfolio(investorId: string, portfolioData: PortfolioData): Promise<{ success: boolean; error?: string }> {
    try {
      await this.prisma.cryptoPortfolioSnapshot.create({
        data: {
          investorId,
          totalValue: portfolioData.totalValue,
          cashBalance: 0,
          totalReturn: 0,
          totalReturnPercent: 0,
          winRate: 0,
          avgWinPercent: 0,
          avgLossPercent: 0,
          maxDrawdown: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          activePositions: 0,
          timestamp: new Date(),
        },
      });

      // Mettre à jour le timestamp dans le profil
      await this.prisma.investorProfile.update({
        where: { id: investorId },
        data: {
          updatedAt: new Date(),
        },
      });

      return { success: true };

    } catch (error) {
      console.error('Erreur lors de la mise à jour du portefeuille:', error);
      return {
        success: false,
        error: 'Erreur lors de la mise à jour du portefeuille',
      };
    }
  }

  /**
   * Ajoute un nouvel investissement pour un investisseur
   */
  async addInvestment(investorId: string, investmentData: InvestmentData): Promise<{ success: boolean; error?: string }> {
    try {
      await this.prisma.cryptoInvestment.create({
        data: {
          id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          investorId,
          coinId: investmentData.symbol.toLowerCase(),
          symbol: investmentData.symbol,
          name: investmentData.symbol,
          action: investmentData.type,
          amount: investmentData.amount,
          price: investmentData.price,
          quantity: investmentData.amount / investmentData.price,
          reason: 'Manual investment',
          expectedHoldDays: 30,
          timestamp: new Date(),
        },
      });

      return { success: true };

    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'investissement:', error);
      return {
        success: false,
        error: 'Erreur lors de l\'ajout de l\'investissement',
      };
    }
  }

  /**
   * Récupère les statistiques des investisseurs
   */
  async getInvestorStats(): Promise<{ success: boolean; data?: InvestorStats; error?: string }> {
    try {
      const totalInvestors = await this.prisma.investorProfile.count({
        where: { isActive: true },
      });

      const totalInvestments = await this.prisma.cryptoInvestment.count();

      const portfolioSummary = await this.prisma.cryptoPortfolioSnapshot.groupBy({
        by: ['investorId'],
        _max: {
          totalValue: true,
        },
      });

      const totalPortfolioValue = portfolioSummary.reduce(
        (sum, snapshot) => sum + (snapshot._max.totalValue || 0),
        0
      );

      return {
        success: true,
        data: {
          totalInvestors,
          totalInvestments,
          totalPortfolioValue,
          averagePortfolioValue: totalInvestors > 0 ? totalPortfolioValue / totalInvestors : 0,
        },
      };

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des statistiques',
      };
    }
  }

  /**
   * Ferme la connexion à la base de données
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
