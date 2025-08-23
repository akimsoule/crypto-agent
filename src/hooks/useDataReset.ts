import { useState } from 'react';
import { useAuth } from './useAuth';

interface ResetOptions {
  investors?: boolean;
  gems?: boolean;
  portfolios?: boolean;
  all?: boolean;
}

interface ResetStats {
  investments: number;
  positions: number;
  snapshots: number;
  investors: number;
  gems: number;
  alerts: number;
}

interface ResetResponse {
  success: boolean;
  message?: string;
  details?: {
    timestamp: string;
    resetInvestors: boolean;
    resetGems: boolean;
    resetPortfolios: boolean;
    resetAll: boolean;
  } & ResetStats;
  error?: string;
}

export const useDataReset = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<ResetStats | null>(null);
  const { token } = useAuth();

  const resetData = async (options: ResetOptions): Promise<ResetResponse | null> => {
    if (!token) {
      setError('Token d\'authentification manquant');
      return null;
    }

    if (!options.investors && !options.gems && !options.portfolios && !options.all) {
      setError('Aucune option de réinitialisation sélectionnée');
      return null;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setStats(null);

    try {
      const params = new URLSearchParams();
      if (options.investors) params.append('investors', 'true');
      if (options.gems) params.append('gems', 'true');
      if (options.portfolios) params.append('portfolios', 'true');
      if (options.all) params.append('all', 'true');

      const url = `/.netlify/functions/reset-data?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data: ResetResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      }

      if (data.success) {
        const message = data.message || 'Réinitialisation des données réussie';
        setSuccess(message);
        
        if (data.details) {
          setStats({
            investments: data.details.investments,
            positions: data.details.positions,
            snapshots: data.details.snapshots,
            investors: data.details.investors,
            gems: data.details.gems,
            alerts: data.details.alerts
          });
        }
        
        return data;
      } else {
        throw new Error(data.error || 'Erreur inconnue lors de la réinitialisation');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la réinitialisation des données';
      setError(errorMessage);
      console.error('Erreur réinitialisation données:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
    setStats(null);
  };

  return {
    resetData,
    loading,
    error,
    success,
    stats,
    clearMessages,
  };
};
