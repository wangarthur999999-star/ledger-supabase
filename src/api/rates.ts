import { supabase } from '../lib/supabase';
import { ExchangeRate } from '../types';

export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*');

  if (error) {
    console.error("Error fetching exchange rates:", error);
    return [];
  }

  return data.map((rate: any) => ({
    pair: rate.pair,
    fullName: rate.full_name,
    official: { buy: rate.official_buy, sell: rate.official_sell },
    street: { buy: rate.street_buy, sell: rate.street_sell },
    change: rate.change,
    symbol: rate.symbol
  }));
}
