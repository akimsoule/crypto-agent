import { useState } from 'react';
import { useAuth } from './useAuth';

interface SeedResponse {
  success: boolean;
  message?: string;
  details?: {
    investorsCreated: number;
    configsCreated: number;
    timestamp: string;
    force: boolean;
    resetData: boolean;
  };
  error?: string;
}

export const useDatabaseSeed = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { token } = useAuth();

  const seedDatabase = async (force = false, resetData = false): Promise<SeedResponse | null> => {
    if (!token) {
      setError('Token d\'authentification manquant');
      return null;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams();
      if (force) params.append('force', 'true');
      if (resetData) params.append('reset', 'true');

      const url = `/.netlify/functions/seed-database${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data: SeedResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      }

      if (data.success) {
        const message = data.message || 'Seed de la base de données réussi';
        setSuccess(message);
        return data;
      } else {
        throw new Error(data.error || 'Erreur inconnue lors du seed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du seed de la base de données';
      setError(errorMessage);
      console.error('Erreur seed database:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return {
    seedDatabase,
    loading,
    error,
    success,
    clearMessages,
  };
};
