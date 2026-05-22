// usePriceHistory: 取单个 symbol 的历史快照, 内置 module-level 缓存。
//
// 设计:
//   - 12 个商品卡片同时挂载时, 每个独立 fetch 自己的历史
//   - 切 tab 时不丢: cache 持久于 module 作用域
//   - 不订阅 realtime: 历史数据每日只多一条, 用 usePrices 的 realtime 触发时
//     间接 invalidate (caller 监听 prices 更新, 自动 refetch 历史)
//   - TTL: 默认 10 分钟, 之后再次访问会自动刷新

import { useEffect, useState } from 'react';
import { fetchPriceHistory, type PriceHistoryPoint } from '../api/priceHistory';

interface CacheEntry {
  data: PriceHistoryPoint[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 分钟
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PriceHistoryPoint[]>>();

function loadHistory(symbol: string, limit: number): Promise<PriceHistoryPoint[]> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }
  // 已有 in-flight 请求, 复用
  const existing = inflight.get(symbol);
  if (existing) return existing;

  const promise = fetchPriceHistory(symbol, limit)
    .then((data) => {
      cache.set(symbol, { data, fetchedAt: Date.now() });
      return data;
    })
    .finally(() => {
      inflight.delete(symbol);
    });
  inflight.set(symbol, promise);
  return promise;
}

export interface UsePriceHistoryResult {
  data: PriceHistoryPoint[];
  isLoading: boolean;
}

export function usePriceHistory(symbol: string, limit = 30): UsePriceHistoryResult {
  const cached = cache.get(symbol);
  const [data, setData] = useState<PriceHistoryPoint[]>(cached?.data ?? []);
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    let canceled = false;
    setIsLoading(!cache.has(symbol));
    loadHistory(symbol, limit).then((d) => {
      if (!canceled) {
        setData(d);
        setIsLoading(false);
      }
    });
    return () => {
      canceled = true;
    };
  }, [symbol, limit]);

  return { data, isLoading };
}

/** 让外部 (例如 usePrices realtime) 在数据变更时主动清除缓存 */
export function invalidatePriceHistory(symbol?: string): void {
  if (symbol) {
    cache.delete(symbol);
  } else {
    cache.clear();
  }
}
