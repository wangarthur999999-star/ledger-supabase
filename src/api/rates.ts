import { supabase } from '../lib/supabase';
import { ExchangeRate } from '../types';

// Supabase 行的原始 shape (snake_case)
interface ExchangeRateRow {
  pair: string;
  full_name: string;
  official_buy: number;
  official_sell: number;
  street_buy: number;
  street_sell: number;
  // change 是 nullable: schema migration 20260520000100 起允许 null
  // (代表数据缺失, UI 应显示 "—" 而非 "0%")
  change: number | null;
  symbol: string;
  updated_at?: string | null;
}

// USD 在前, EUR 在后, 其他按字母序。
// Supabase 返回顺序不保证, 显式排好让 UI 稳定。
const PAIR_ORDER: Record<string, number> = {
  'USD / SRD': 0,
  'EUR / SRD': 1,
};
function pairSortKey(pair: string): number {
  return PAIR_ORDER[pair] ?? 100;
}

export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select(
      'pair, full_name, official_buy, official_sell, street_buy, street_sell, change, symbol, updated_at',
    );

  if (error) {
    console.error('Error fetching exchange rates:', error);
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ExchangeRateRow[];

  return rows
    .map((rate) => ({
      pair: rate.pair,
      fullName: rate.full_name,
      official: { buy: Number(rate.official_buy), sell: Number(rate.official_sell) },
      street: { buy: Number(rate.street_buy), sell: Number(rate.street_sell) },
      // 关键: 不能 Number(null) -> 0, 那会把 "数据缺失" 跟 "0%" 混在一起
      change: rate.change === null ? null : Number(rate.change),
      symbol: rate.symbol,
      updatedAt: rate.updated_at ?? undefined,
    }))
    .sort((a, b) => pairSortKey(a.pair) - pairSortKey(b.pair) || a.pair.localeCompare(b.pair));
}
