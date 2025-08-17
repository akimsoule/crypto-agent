// Types liés aux investisseurs
import type { InvestorProfile, CryptoInvestment, CryptoPosition, CryptoPortfolioSnapshot } from '@prisma/client';

// Type pour créer un InvestorProfile (sans les champs générés automatiquement)
export type InvestorProfileInput = Omit<InvestorProfile, 'createdAt' | 'updatedAt'>;

// Utilisation des types Prisma existants pour Investment (utiliser CryptoInvestment)
// On exclut les relations car elles ne sont pas sérialisées en JSON
export type Investment = Omit<CryptoInvestment, 'investor' | 'gemProject'>;

// Type pour créer un Investment (sans les champs générés automatiquement et les relations)
export type InvestmentInput = Omit<Investment, 'timestamp' | 'isExecuted' | 'executionPrice' | 'fees' | 'notes' | 'marketType'>;

// Utiliser le type Prisma pour Portfolio avec relations chargées
export type Portfolio = CryptoPortfolioSnapshot & {
  positions: CryptoPosition[];
};

// Utiliser le type Prisma CryptoPosition directement
export type Position = CryptoPosition;

// Type pour les métriques de performance (extrait de CryptoPortfolioSnapshot)
export type PerformanceMetrics = Pick<CryptoPortfolioSnapshot, 
  | 'totalReturn' 
  | 'totalReturnPercent' 
  | 'winRate' 
  | 'avgWinPercent' 
  | 'avgLossPercent' 
  | 'maxDrawdown' 
  | 'totalTrades' 
  | 'winningTrades' 
  | 'losingTrades'
>;

export interface Trade {
  coinId: string;
  buyPrice: number | null;
  sellPrice: number;
  pnl: number;
  pnlPercent: number;
  holdDays: number;
  quantity: number;
  buyTimestamp: Date | null;
  sellTimestamp: Date;
}

// Factory pour créer les profils d'investisseurs prédéfinis
export class InvestorProfileFactory {
  static createProfiles(): InvestorProfileInput[] {
    return [
      {
        id: "conservative_bob",
        name: "Bob le Conservateur",
        type: "conservative",
        riskTolerance: 0.3,
        maxPositionSize: 15, // 15% max par position
        holdingPeriod: 30, // 30 jours
        sellThreshold: 12, // Vendre à +12%
        stopLoss: 8, // Stop loss à -8%
        sentimentWeight: 0.2,
        technicalWeight: 0.8,
        description: "Investisseur prudent qui privilégie la préservation du capital",
        initialBalance: 10000,
        isActive: true
      },
      {
        id: "balanced_alice",
        name: "Alice l'Équilibrée",
        type: "balanced",
        riskTolerance: 0.6,
        maxPositionSize: 20,
        holdingPeriod: 21,
        sellThreshold: 25,
        stopLoss: 12,
        sentimentWeight: 0.4,
        technicalWeight: 0.6,
        description: "Investisseuse équilibrée qui combine croissance et stabilité",
        initialBalance: 10000,
        isActive: true
      },
      {
        id: "aggressive_charlie",
        name: "Charlie l'Agressif",
        type: "aggressive",
        riskTolerance: 0.9,
        maxPositionSize: 30,
        holdingPeriod: 14,
        sellThreshold: 50,
        stopLoss: 20,
        sentimentWeight: 0.3,
        technicalWeight: 0.7,
        description: "Investisseur agressif en quête de gains importants",
        initialBalance: 10000,
        isActive: true
      },
      {
        id: "momentum_diana",
        name: "Diana la Momentum",
        type: "momentum",
        riskTolerance: 0.7,
        maxPositionSize: 25,
        holdingPeriod: 7,
        sellThreshold: 30,
        stopLoss: 15,
        sentimentWeight: 0.6,
        technicalWeight: 0.4,
        description: "Investisseuse qui suit les tendances et le momentum",
        initialBalance: 10000,
        isActive: true
      },
      {
        id: "contrarian_erik",
        name: "Erik le Contrarian",
        type: "contrarian",
        riskTolerance: 0.8,
        maxPositionSize: 25,
        holdingPeriod: 45,
        sellThreshold: 40,
        stopLoss: 18,
        sentimentWeight: 0.8,
        technicalWeight: 0.2,
        description: "Investisseur contrarian qui achète quand les autres vendent",
        initialBalance: 10000,
        isActive: true
      }
    ];
  }
}
