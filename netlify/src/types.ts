// Types et interfaces partagés pour le système d'investissement
export interface InvestorProfile {
  id: string;
  name: string;
  type: "conservative" | "balanced" | "aggressive" | "contrarian" | "momentum";
  riskTolerance: number; // 0.1 à 1.0
  maxPositionSize: number; // Pourcentage du portefeuille
  holdingPeriod: number; // En jours
  sellThreshold: number; // Profit % avant vente
  stopLoss: number; // Perte % avant vente
  sentimentWeight: number; // Importance du sentiment (0-1)
  technicalWeight: number; // Importance des indicateurs techniques (0-1)
  description: string;
}

export interface Investment {
  id: string;
  investorId: string;
  coinId: string;
  symbol: string;
  name: string;
  action: "BUY" | "SELL" | "HOLD";
  amount: number; // En USD
  price: number; // Prix d'achat/vente
  quantity: number;
  timestamp: Date;
  reason: string;
  gemScore?: number;
  sentiment?: number;
  expectedHoldDays: number;
  targetProfit?: number;
  stopLoss?: number;
}

export interface Portfolio {
  investorId: string;
  totalValue: number;
  cashBalance: number;
  positions: Position[];
  performance: PerformanceMetrics;
}

export interface Position {
  coinId: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  daysSinceEntry: number;
  entryDate: Date; // date d'entrée réelle
  lastUpdated: Date;
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  winRate: number;
  avgWinPercent: number;
  avgLossPercent: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

// Factory pour créer les profils d'investisseurs prédéfinis
export class InvestorProfileFactory {
  static createProfiles(): InvestorProfile[] {
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
        description: "Investisseur prudent qui privilégie la préservation du capital"
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
        description: "Investisseuse équilibrée qui combine croissance et stabilité"
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
        description: "Investisseur agressif en quête de gains importants"
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
        description: "Investisseuse qui suit les tendances et le momentum"
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
        description: "Investisseur contrarian qui achète quand les autres vendent"
      }
    ];
  }
}
