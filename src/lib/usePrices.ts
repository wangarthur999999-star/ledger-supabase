// Prices 共享 store. 实现细节见 createSharedStore.ts
import { supabase } from './supabase';
import { createSharedStore } from './createSharedStore';
import { invalidatePriceHistory } from './usePriceHistory';

export interface PriceItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  currency: string | null;
  unit: string;
  change: number | null;
  change_pct: number | null;
  source: string;
  updated_at: string;
}

async function fetchPrices(): Promise<PriceItem[]> {
  const { data, error } = await supabase
    .from('prices')
    .select('*')
    .order('symbol', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PriceItem[];
}

const pricesStore = createSharedStore<PriceItem[]>({
  initial: [],
  fetcher: fetchPrices,
  table: 'prices',
  channelName: 'prices_shared',
  // 当 prices 更新 (例如爬虫写入触发 realtime), 失效那些 symbol 的历史缓存,
  // 让 Sparkline 重新拉一次拿到新点。比 polling 干净。
  onAfterFetch: (prev, next) => {
    // 找出 updated_at 变化的 symbols, 只 invalidate 它们
    const prevByMap = new Map(prev.map((p) => [p.symbol, p.updated_at]));
    for (const p of next) {
      if (prevByMap.get(p.symbol) !== p.updated_at) {
        invalidatePriceHistory(p.symbol);
      }
    }
  },
});

export interface UsePricesResult {
  prices: PriceItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePrices(): UsePricesResult {
  const { data, isLoading, error, refresh } = pricesStore.useStore();
  return { prices: data, isLoading, error, refresh };
}

export const refreshPrices = pricesStore.refresh;
