import { useState } from 'react';
import { useAuth } from './useAuth';

interface ResetStats {
  investments?: number;
  positions?: number;
  snapshots?: number;
  investors?: number;
  gems?: number;
  alerts?: number;
}

interface ResetResponse {
  success: boolean;
  message?: string;
  details?: ResetStats & {
    timestamp: string;
    [key: string]: unknown;
  };
  error?: string;
}

/**
 * Hook optimisé pour réinitialiser les données
 * Utilise des fonctions Netlify spécialisées pour réduire la taille
 */
export const useOptimizedDataReset = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<ResetStats | null>(null);
  const { token } = useAuth();

  const resetInvestors = async (): Promise<ResetResponse | null> => {
    if (!token) {
      setError('Token d\'authentification manquant');
      return null;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/reset-investors', {
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

      setSuccess('Réinitialisation des investisseurs terminée');
      
      if (data.details) {
        setStats({
          investments: data.details.investments,
          investors: data.details.investors
        });
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la réinitialisation';
      setError(errorMessage);
      console.error('Erreur réinitialisation investisseurs:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const resetGems = async (resetState = false): Promise<ResetResponse | null> => {
    if (!token) {
      setError('Token d\'authentification manquant');
      return null;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const url = resetState 
        ? '/api/reset-gems?resetState=true'
        : '/api/reset-gems';
        
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

      setSuccess('Réinitialisation des gems terminée');
      
      if (data.details) {
        setStats({
          gems: data.details.gems,
          alerts: data.details.alerts
        });
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la réinitialisation';
      setError(errorMessage);
      console.error('Erreur réinitialisation gems:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const resetPortfolios = async (): Promise<ResetResponse | null> => {
    if (!token) {
      setError('Token d\'authentification manquant');
      return null;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/reset-portfolios', {
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

      setSuccess('Réinitialisation des portfolios terminée');
      
      if (data.details) {
        setStats({
          positions: data.details.positions,
          snapshots: data.details.snapshots
        });
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la réinitialisation';
      setError(errorMessage);
      console.error('Erreur réinitialisation portfolios:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const resetAll = async (): Promise<ResetResponse | null> => {
    if (!token) {
      setError('Token d\'authentification manquant');
      return null;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setStats(null);
    
    try {
      const response = await fetch('/api/reset-orchestrator?all=true', {
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

      const message = data.message || 'Réinitialisation complète terminée';
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la réinitialisation';
      setError(errorMessage);
      console.error('Erreur réinitialisation complète:', err);
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
    resetInvestors,
    resetGems,
    resetPortfolios,
    resetAll,
    loading,
    error,
    success,
    stats,
    clearMessages,
  };
};
