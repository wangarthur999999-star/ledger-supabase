-- ============================================================================
-- Ledger Suriname · 性能索引补充
-- ============================================================================
-- 之前 schema 只在 exchange_rates_history (pair, recorded_at DESC) 上加了索引,
-- 其余表都靠 PK + UNIQUE。现在补几个常用查询路径的索引:
--
--   1. prices.updated_at DESC
--      前端 PricesView 按 symbol 排序查全表, 没问题。但 cron 跑 update_prices
--      时频繁 select 单行 by symbol, 用现有的 UNIQUE(symbol) 即可。
--      然而 dashboard 想做 "所有商品按更新时间倒序" 这种查询时,
--      此索引会显著加速。预先加好不亏 (索引很小)。
--
--   2. prices.source
--      未来可能想区分 'fred' / 'metals.dev' 分别看历史, 顺手加上。
--
-- 索引代价: 写入时多维护几个 B-tree。我们表小 + 写少 (一日一次), 几乎免费。
-- ============================================================================

CREATE INDEX IF NOT EXISTS prices_updated_at_idx
  ON public.prices (updated_at DESC);

CREATE INDEX IF NOT EXISTS prices_source_idx
  ON public.prices (source);
