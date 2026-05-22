// 汇率共享 store. 实现细节见 createSharedStore.ts
import type { ExchangeRate } from '../types';
import { fetchExchangeRates } from '../api/rates';
import { createSharedStore } from './createSharedStore';

const exchangeRatesStore = createSharedStore<ExchangeRate[]>({
  initial: [],
  fetcher: fetchExchangeRates,
  table: 'exchange_rates',
  channelName: 'exchange_rates_shared',
});

export interface UseExchangeRatesResult {
  rates: ExchangeRate[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useExchangeRates(): UseExchangeRatesResult {
  const { data, isLoading, error, refresh } = exchangeRatesStore.useStore();
  return { rates: data, isLoading, error, refresh };
}

// 给非 hook 调用方暴露强刷 (TopAppBar 的刷新按钮用)
export const refreshExchangeRates = exchangeRatesStore.refresh;
