import { supabase } from '../lib/supabase';

export interface PriceHistoryPoint {
  recorded_at: string;
  price: number;
}

/**
 * 取某个 symbol 最近 N 个数据点 (默认 30, 大约 30 天)。
 * 返回时间升序数组 (旧 -> 新), 直接喂给 sparkline 组件。
 *
 * 注: 后端按 recorded_at DESC 拿最近 N, 然后前端反转成 ASC。
 * 用 DESC 排序走 (symbol, recorded_at DESC) 索引, 比 ASC + offset 高效。
 */
export async function fetchPriceHistory(
  symbol: string,
  limit = 30,
): Promise<PriceHistoryPoint[]> {
  const { data, error } = await supabase
    .from('prices_history')
    .select('recorded_at, price')
    .eq('symbol', symbol)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[priceHistory] fetch ${symbol} failed:`, error.message);
    return [];
  }

  // 反转回升序 (老 -> 新), 这是 sparkline 期望的顺序
  return (data ?? [])
    .map((row) => ({
      recorded_at: row.recorded_at as string,
      price: Number(row.price),
    }))
    .reverse();
}
