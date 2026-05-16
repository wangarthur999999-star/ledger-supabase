import { supabase } from '../lib/supabase';

export interface CommodityMiniCardData {
  symbol: string;
  name: string;
  price: number;
  unit: string;
  change_pct: number | null;
}

export async function fetchDashboardCommodities(
  symbols: string[]
): Promise<CommodityMiniCardData[]> {
  const { data, error } = await supabase
    .from('prices')
    .select('symbol, name, price, unit, change_pct')
    .in('symbol', symbols);

  if (error) {
    throw new Error(error.message);
  }

  const ordered = symbols
    .map((sym) => (data ?? []).find((d) => d.symbol === sym))
    .filter((d): d is CommodityMiniCardData => d !== undefined);

  return ordered;
}
