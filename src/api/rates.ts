import { supabase } from '../lib/supabase';
import { ExchangeRate } from '../types';

interface RawExchangeRate {
  pair: string;
  full_name: string;
  official_buy: number;
  official_sell: number;
  street_buy: number;
  street_sell: number;
  change: number;
  symbol: string;
  updated_at: string;
}

export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*');

  if (error) {
    throw new Error(error.message);
  }

  return (data as RawExchangeRate[]).map((rate) => ({
    pair: rate.pair,
    fullName: rate.full_name,
    official: { buy: rate.official_buy, sell: rate.official_sell },
    street: { buy: rate.street_buy, sell: rate.street_sell },
    change: rate.change,
    symbol: rate.symbol,
    updatedAt: rate.updated_at,
  }));
}

export async function fetchUSDRate(): Promise<number> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('street_buy')
    .ilike('pair', '%USD%')
    .limit(1)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.street_buy;
}
