import { useEffect, useState, useCallback } from 'react';

// Types basés sur la réponse du serveur (structure Prisma)
export interface CryptoInvestment {
  id: string;
  investorId: string;
  coinId: string;
  symbol: string;
  timestamp: string;
  lastExecutedAt?: string | null;
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
  lastExecutedAt?: string | null;
}

export interface CryptoPortfolioSnapshot {
  id: number;
  investorId: string;
  timestamp: string;
  totalValue: number;
  cashBalance: number;
  totalReturn: number;
  totalReturnPercent: number;
  currentGain?: number; // PnL latent courant si positions ouvertes
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
  type?: string;
  active: boolean; // Note: dans l'API c'est isActive; on peut garder les deux pour compat
  isActive?: boolean;
  portfolioSnapshots: CryptoPortfolioSnapshot[];
  investments: CryptoInvestment[];
  realizedPnlTotal?: number; // somme des trades fermés (realized)
  totalGain?: number; // realized + latent ou currentBalance - initialBalance
  totalGainPercent?: number; // ratio vs initialBalance
  currentBalance?: number; // balance reconstruite (si suivie)
  perSymbolUnrealized?: Array<{ symbol: string; unrealized: number }>;
  topSymbol?: string;
  volatilityProxy?: number; // ratio PnL / initialBalance
  unrealizedDispersion?: number; // std dev des PnL par symbole
  lastExecutions?: Array<{ symbol: string; lastExecutedAt: string }>;
  lastExecutedAt?: string | null;
  // champs calculés côté client (ajoutés dans InvestorsList)
  _avgGain?: number;
  _topPnL?: number;
}

export function useInvestors() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [wantMetrics, setWantMetrics] = useState(true);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (includeInactive) params.set('includeInactive', '1');
    if (wantMetrics) params.set('metrics', '1');
    const qs = params.toString();
    return qs ? `/api/investors?${qs}` : '/api/investors';
  }, [includeInactive, wantMetrics]);

  // Fonction pour charger les investisseurs
  const fetchInvestors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(buildUrl());
      if (!response.ok) throw new Error('Erreur lors du chargement des investisseurs');
      const data: {success : boolean, data: Investor[]} = await response.json();
      setInvestors(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => { fetchInvestors(); }, [fetchInvestors]);

  const getInvestorDetail = async (id: string, options?: { side?: 'long' | 'short' }): Promise<{ success: boolean; data?: Investor; error?: string }> => {
    try {
      const params = new URLSearchParams({ id });
      if (options?.side) params.set('side', options.side);
      const response = await fetch(`/api/investorDetail?${params.toString()}`);
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

  // Ajout de la fonction refetch pour recharger les investisseurs
  return { investors, loading, error, getInvestorDetail, refetch: fetchInvestors, includeInactive, setIncludeInactive, wantMetrics, setWantMetrics };
}
