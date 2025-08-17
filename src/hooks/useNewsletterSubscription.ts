import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface NewsletterSubscriptionState {
  email: string;
  isLoading: boolean;
  isSubscribed: boolean;
  error: string | null;
  success: string | null;
}

export interface NewsletterResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    email: string;
    isActive: boolean;
    createdAt: string;
  };
}

export function useNewsletterSubscription() {
  const { token } = useAuth();
  const [state, setState] = useState<NewsletterSubscriptionState>({
    email: '',
    isLoading: false,
    isSubscribed: false,
    error: null,
    success: null,
  });

  const setEmail = useCallback((email: string) => {
    setState(prev => ({ ...prev, email, error: null, success: null }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, error: null, success: null }));
  }, []);

  const subscribe = useCallback(async (email?: string) => {
    const emailToUse = email || state.email;
    
    if (!emailToUse) {
      setState(prev => ({ ...prev, error: 'Veuillez saisir une adresse email' }));
      return;
    }

    // Validation email côté client
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToUse)) {
      setState(prev => ({ ...prev, error: 'Veuillez saisir une adresse email valide' }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      success: null 
    }));

    try {
      // Construction des headers avec token si disponible
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: emailToUse.toLowerCase(),
          source: 'web',
          preferences: {
            frequency: 'weekly',
            topics: ['crypto', 'investments', 'market-analysis'],
          },
        }),
      });

      const data: NewsletterResponse = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isSubscribed: true,
          success: data.message,
          email: '',
          error: null,
        }));

        // Réinitialiser le statut après 5 secondes
        setTimeout(() => {
          setState(prev => ({ ...prev, isSubscribed: false, success: null }));
        }, 5000);
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message,
          success: null,
        }));
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur de connexion. Veuillez réessayer.',
        success: null,
      }));
    }
  }, [state.email, token]);

  const unsubscribe = useCallback(async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, success: null }));

    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`/api/newsletter?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers
      });

      const data: NewsletterResponse = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          success: data.message,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message,
          success: null,
        }));
      }
    } catch (error) {
      console.error('Erreur lors du désabonnement:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur de connexion. Veuillez réessayer.',
        success: null,
      }));
    }
  }, [token]);

  return {
    ...state,
    setEmail,
    subscribe,
    unsubscribe,
    clearMessages,
  };
}
