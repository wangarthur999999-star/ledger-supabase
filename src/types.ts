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
  // change 为 null 表示数据缺失 (首次写入 / 计算失败), UI 显示 "—" 而非 0%。
  // 之前 schema 是 NOT NULL, change=0 三义化; 新 schema (migration 20260520000100)
  // 允许 null, 爬虫已经写 null。
  change: number | null;
  symbol: string;
  updatedAt?: string;
}

export type TabId = 'dashboard' | 'rates' | 'prices' | 'settings';
