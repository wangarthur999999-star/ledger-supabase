import { supabase } from '../lib/supabase';
import { Product } from '../types';

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      prices:product_prices(
        supermarket,
        price,
        availability
      )
    `);

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return data.map((product: any) => ({
    id: product.id,
    name: product.name,
    lowestPrice: product.lowest_price,
    image: product.image,
    prices: product.prices
  }));
}
