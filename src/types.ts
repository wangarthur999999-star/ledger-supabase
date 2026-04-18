export interface ExchangeRate {
  pair: string;
  fullName: string;
  official: {
    buy: number;
    sell: number;
  };
  street: {
    buy: number;
    sell: number;
  };
  change: number;
  symbol: string;
}

export interface Folder {
  id: string;
  name: string;
  validity: string;
  image: string;
}

export interface ProductPrice {
  supermarket: string;
  price: number;
  availability: 'OP VOORRAAD' | 'BEPERKT' | 'UITVERKOCHT';
}

export interface Product {
  id: string;
  name: string;
  lowestPrice: number;
  image: string;
  prices: ProductPrice[];
}

export type TabId = 'dashboard' | 'rates' | 'prices' | 'folders' | 'settings';
