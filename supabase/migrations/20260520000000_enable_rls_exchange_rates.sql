-- ============================================================================
-- Ledger Suriname · 给 exchange_rates 表加 RLS
-- ============================================================================
-- 问题: supabase-schema.sql 创建 exchange_rates 时没启 RLS,
--       结果是任何拿到 anon key 的人 (前端代码里就有) 都能写库,
--       修改汇率。这是公开端泄漏点。
--
-- 修复:
--   1. ENABLE RLS
--   2. anon / authenticated 仅可 SELECT
--   3. 不加 INSERT/UPDATE/DELETE policy: service_role (爬虫脚本用) 自动 bypass RLS
--
-- 跟 prices 表 (20260423 migration) 保持一致。
--
-- 幂等: 反复跑不报错。
-- ============================================================================

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'exchange_rates'
      AND policyname = 'Public Read Exchange Rates'
  ) THEN
    CREATE POLICY "Public Read Exchange Rates" ON public.exchange_rates
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- exchange_rates_history 同样: 历史是公开数据, 不必保护; 写入走 service_role
ALTER TABLE public.exchange_rates_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'exchange_rates_history'
      AND policyname = 'Public Read Exchange Rates History'
  ) THEN
    CREATE POLICY "Public Read Exchange Rates History" ON public.exchange_rates_history
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
