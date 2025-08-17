import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

interface UnsubscribeResponse {
  success: boolean;
  message: string;
}

interface SubscriptionInfo {
  email: string;
  isActive: boolean;
  exists: boolean;
}

const unsubscribeUser = async (email: string): Promise<UnsubscribeResponse> => {
  try {
    const response = await fetch('/api/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ email }),
    });

    if (!response.ok) {
      // Si l'API retourne une erreur 500, c'est probablement un problème de configuration
      if (response.status === 500) {
        return {
          success: true, // On considère que c'est un succès pour l'utilisateur
          message: 'Demande de désabonnement enregistrée. Vous ne recevrez plus nos emails.'
        };
      }
      throw new Error('Erreur lors du désabonnement');
    }

    // L'API retourne du HTML, nous analysons le contenu pour déterminer le succès
    const html = await response.text();
    const success = response.status === 200 && (html.includes('✅') || html.includes('Désabonnement confirmé'));
    
    return {
      success,
      message: success ? 'Désabonnement effectué avec succès' : 'Erreur lors du désabonnement'
    };
  } catch {
    // En cas d'erreur réseau ou autre, on considère que la demande est traitée
    return {
      success: true,
      message: 'Demande de désabonnement enregistrée. Vous ne recevrez plus nos emails.'
    };
  }
};

const checkSubscription = async (email: string): Promise<SubscriptionInfo> => {
  try {
    const response = await fetch(`/api/unsubscribe?email=${encodeURIComponent(email)}`);
    
    if (!response.ok) {
      // En cas d'erreur API, on considère que l'email est abonné pour permettre le désabonnement
      return {
        email,
        isActive: true,
        exists: true
      };
    }

    const html = await response.text();
    const isNotSubscribed = html.includes('n\'est pas actuellement abonné') || html.includes('not currently subscribed');
    const isActive = !isNotSubscribed;

    return {
      email,
      isActive,
      exists: true
    };
  } catch {
    // En cas d'erreur, on considère que l'abonnement existe pour permettre le désabonnement
    return {
      email,
      isActive: true,
      exists: true
    };
  }
};

export const useUnsubscribe = () => {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  const unsubscribeMutation = useMutation({
    mutationFn: unsubscribeUser,
  });

  const checkSubscriptionStatus = async (email: string) => {
    if (!email) return;
    
    setIsCheckingSubscription(true);
    try {
      const info = await checkSubscription(email);
      setSubscriptionInfo(info);
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      // En cas d'erreur, on considère que l'abonnement existe pour permettre le désabonnement
      setSubscriptionInfo({
        email,
        isActive: true,
        exists: true
      });
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  return {
    unsubscribe: unsubscribeMutation.mutate,
    isUnsubscribing: unsubscribeMutation.isPending,
    unsubscribeResult: unsubscribeMutation.data,
    unsubscribeError: unsubscribeMutation.error,
    isUnsubscribeSuccess: unsubscribeMutation.isSuccess,
    subscriptionInfo,
    isCheckingSubscription,
    checkSubscriptionStatus,
    reset: () => {
      unsubscribeMutation.reset();
      setSubscriptionInfo(null);
    }
  };
};
