-- ============================================================================
-- Ledger Suriname · prices_history 表
-- ============================================================================
-- 对应 exchange_rates_history 的功能: 每次 update_prices 写入 prices 表时,
-- 同时往这里 append 一行快照, 用于 UI 画 sparkline 趋势图。
--
-- 设计:
--   - 每个 (symbol, recorded_at) 唯一, 但不强制 (高频写入场景下不需要)
--   - (symbol, recorded_at DESC) 索引让 "取最近 30 天" 这种查询走索引
--   - RLS 开 SELECT, service_role 写入
--
-- 数据量预估:
--   每日 1 次 × 11 个商品 = 11 行/日 = ~4k 行/年。365 天后查询用 LIMIT 30 即可,
--   不需要分区/归档。月度商品的优化跳过 (跳过 prices upsert 时, 这里也跳过),
--   见 update_prices.js 的 insertPricesHistory()。
--
-- 幂等。
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prices_history (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      TEXT          NOT NULL,
  price       NUMERIC(12,4) NOT NULL CHECK (price > 0),
  recorded_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prices_history_symbol_recorded_at_idx
  ON public.prices_history (symbol, recorded_at DESC);

ALTER TABLE public.prices_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prices_history'
      AND policyname = 'Public Read Prices History'
  ) THEN
    CREATE POLICY "Public Read Prices History" ON public.prices_history
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
