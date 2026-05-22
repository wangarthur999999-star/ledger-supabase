-- 创建 exchange_rates_history 表,用于记录每次汇率更新的快照
--
-- 用途:
--   每次 scripts/update_rates.js 写库前,先把当前 exchange_rates 中的值
--   插入一行到 history 表。这样:
--     1. exchange_rates 始终保持最新值(单行 per pair)
--     2. exchange_rates_history 保留完整时序数据
--     3. change 字段可以基于 24 小时前的真实历史值计算,不再是占位符
--
-- 此 migration 需要在 Supabase Dashboard SQL Editor 中手动执行。
-- 此文件作 git 归档,便于未来重建数据库。

CREATE TABLE IF NOT EXISTS public.exchange_rates_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair TEXT NOT NULL,
  official_buy NUMERIC(10, 2) NOT NULL,
  official_sell NUMERIC(10, 2) NOT NULL,
  street_buy NUMERIC(10, 2) NOT NULL,
  street_sell NUMERIC(10, 2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引:按 pair 查询某币种历史时按时间倒序 (用于 computeChange 查 24h 前最近一条)
CREATE INDEX IF NOT EXISTS exchange_rates_history_pair_recorded_at_idx
  ON public.exchange_rates_history (pair, recorded_at DESC);

-- 注意:故意不加 unique 约束。
-- 如果同一天爬虫跑两次 (定时 + 手动 workflow_dispatch),应该都记录。
