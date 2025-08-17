import { useEffect, useState } from 'react';

// Types basés sur la réponse du serveur (structure Prisma)
export interface CryptoInvestment {
  id: string;
  investorId: string;
  coinId: string;
  symbol: string;
  timestamp: string;
  // Ajoutez d'autres champs si nécessaire
}

export interface CryptoPosition {
  id: number;
  snapshotId: number;
  coinId: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  daysSinceEntry: number;
  lastUpdated: string;
}

export interface CryptoPortfolioSnapshot {
  id: number;
  investorId: string;
  timestamp: string;
  totalValue: number;
  cashBalance: number;
  totalReturn: number;
  totalReturnPercent: number;
  winRate: number;
  avgWinPercent: number;
  avgLossPercent: number;
  maxDrawdown: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  activePositions: number;
  positions: CryptoPosition[];
}

// Structure exacte de la réponse API
export interface Investor {
  id: string;
  name: string;
  type: string;
  riskTolerance: number;
  maxPositionSize: number;
  holdingPeriod: number;
  sellThreshold: number;
  stopLoss: number;
  sentimentWeight: number;
  technicalWeight: number;
  description: string;
  initialBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  investments: CryptoInvestment[];
  portfolioSnapshots: CryptoPortfolioSnapshot[];
}

export function useInvestors() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvestors() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/investors');
        if (!response.ok) throw new Error('Erreur lors du chargement des investisseurs');
        const data: {success : boolean, data: Investor[]} = await response.json();
        setInvestors(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    }
    fetchInvestors();
  }, []);

  const getInvestorDetail = async (id: string): Promise<{ success: boolean; data?: Investor; error?: string }> => {
    try {
      const response = await fetch(`/api/investorDetail?id=${id}`);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des détails');
      }
      const data = await response.json();
      const investor = data.data as Investor;
      return { success: true, data : investor };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erreur inconnue' 
      };
    }
  };

  return { investors, loading, error, getInvestorDetail };
}
