import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ExchangeRate } from '../types';
import { fetchExchangeRates } from '../api/rates';
import { supabase } from '../lib/supabase';

interface ExchangeRateContextType {
  rates: ExchangeRate[];
  isLoading: boolean;
  error: string | null;
  usdRate: number;
  refresh: () => Promise<void>;
}

const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(undefined);

export function ExchangeRateProvider({ children }: { children: React.ReactNode }) {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRates = useCallback(async () => {
    try {
      const data = await fetchExchangeRates();
      setRates(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchExchangeRates().then(setRates).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const channel = supabase
      .channel('rates_context_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exchange_rates' }, async () => {
        const data = await fetchExchangeRates();
        setRates(data);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[ExchangeRateContext] Realtime channel error:', status);
        }
      });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [loadRates]);

  const usdRate = rates.find((r) => r.pair.includes('USD'))?.street.buy ?? 0;

  return (
    <ExchangeRateContext.Provider value={{ rates, isLoading, error, usdRate, refresh: loadRates }}>
      {children}
    </ExchangeRateContext.Provider>
  );
}

export function useExchangeRates() {
  const context = useContext(ExchangeRateContext);
  if (!context) throw new Error('useExchangeRates must be used within ExchangeRateProvider');
  return context;
}
