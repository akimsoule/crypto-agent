import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface Subscription {
  id: number;
  email: string;
  isActive: boolean;
  source: string;
  createdAt: string;
  lastEmailSent: string | null;
  emailsSent: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SubscriptionsData {
  subscriptions: Subscription[];
  pagination: PaginationInfo;
}

export interface SendResult {
  success: boolean;
  message: string;
  stats?: {
    sent: number;
    failed: number;
  };
}

export function useNewsletterAdmin() {
  const { token } = useAuth();
  const [data, setData] = useState<SubscriptionsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sendingNewsletter, setSendingNewsletter] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const fetchSubscriptions = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`/api/newsletter?page=${page}&limit=20&active=true`, { headers });
      if (!response.ok) throw new Error('Erreur lors du chargement des données');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchSubscriptions(currentPage);
    }
  }, [currentPage, token, fetchSubscriptions]);

  const sendNewsletter = useCallback(async () => {
    setSendingNewsletter(true);
    setSendResult(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/newsletter-send', {
        method: 'POST',
        headers,
      });
      const result = await response.json();
      setSendResult(result);
    } catch {
      setSendResult({ success: false, message: 'Erreur lors de l\'envoi de la newsletter' });
    } finally {
      setSendingNewsletter(false);
    }
  }, [token]);

  const clearSendResult = useCallback(() => {
    setSendResult(null);
  }, []);

  const refreshData = useCallback(() => {
    if (token) {
      fetchSubscriptions(currentPage);
    }
  }, [token, fetchSubscriptions, currentPage]);

  return {
    data,
    loading,
    error,
    currentPage,
    setCurrentPage,
    sendingNewsletter,
    sendResult,
    fetchSubscriptions,
    sendNewsletter,
    clearSendResult,
    refreshData,
  };
}
