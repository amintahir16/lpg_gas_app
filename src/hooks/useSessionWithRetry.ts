'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface UseSessionWithRetryReturn {
  data: any;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
  retry: () => void;
}

export function useSessionWithRetry(): UseSessionWithRetryReturn {
  const { data, status, update } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = async () => {
    try {
      setError(null);
      setRetryCount(prev => prev + 1);
      await update();
    } catch (err) {
      console.error('Session retry failed:', err);
      setError('Failed to refresh session. Please try logging in again.');
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated' && retryCount === 0) {
      // Don't show error on initial load
      return;
    }

    if (status === 'unauthenticated' && retryCount > 0) {
      setError('Session expired. Please log in again.');
    } else if (status === 'authenticated') {
      setError(null);
      setRetryCount(0);
    }
  }, [status, retryCount]);

  // Auto-retry on network recovery
  useEffect(() => {
    const handleOnline = () => {
      if (status === 'unauthenticated' && retryCount < 3) {
        setTimeout(() => retry(), 1000);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [status, retryCount]);

  return {
    data,
    status,
    error,
    retry
  };
}
