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
  updatedAt?: string;
}

export interface Folder {
  id: string;
  name: string;
  validity: string;
  image: string;
}

export type TabId = 'dashboard' | 'rates' | 'prices' | 'folders' | 'settings';
