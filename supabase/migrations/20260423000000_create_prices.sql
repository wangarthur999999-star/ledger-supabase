-- ============================================================================
-- Ledger Suriname · Task E · Prices table
-- ============================================================================
-- 创建 prices 表：国际大宗商品价格（由 scripts/update_prices.js 写入）
--
-- 数据源：
--   FRED API (https://fred.stlouisfed.org/docs/api/)
--     WTI    = DCOILWTICO    (WTI Crude, USD/bbl)
--     BRENT  = DCOILBRENTEU  (Brent Crude, USD/bbl)
--     COPPER = PCOPPUSDM     (USD/MT → 1/2204.62 = USD/lb)
--
-- 特性：
--   · RLS 启用，匿名可读
--   · symbol 列 UNIQUE（爬虫用 upsert onConflict: 'symbol'）
--   · 加入 supabase_realtime publication（前端可订阅变化）
--   · 使用共享的 set_updated_at() 触发器函数（定义在 exchange_rates 迁移中）
--
-- 幂等性：
--   本文件所有 DDL 都是幂等的——可以在任意环境（全新库 / 已有库）
--   多次运行而不报错。
--
-- 执行方式：
--   生产环境：已通过 Supabase Dashboard SQL Editor 执行完毕（2026-04-23/24）
--   本地复制：直接在 Supabase CLI `supabase db push` 或 Dashboard 里跑
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. 建表
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prices (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol     text        NOT NULL,                    -- 'WTI', 'BRENT', 'COPPER', 'GOLD', 'SILVER'
  name       text        NOT NULL,                    -- 人类可读名，'WTI Crude' / 'Brent Crude' / 'Copper'
  price      numeric(12,4) NOT NULL CHECK (price > 0),
  currency   text        DEFAULT 'USD',
  change     numeric(12,4),                           -- 当前价 - 上次价，由爬虫计算
  change_pct numeric(10,4),                           -- change / oldPrice * 100
  source     text        NOT NULL,                    -- 'fred' | 'metals.dev' | ...
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. symbol 必须 UNIQUE（爬虫 upsert 依赖此约束）
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prices_symbol_key'
  ) THEN
    ALTER TABLE public.prices ADD CONSTRAINT prices_symbol_key UNIQUE (symbol);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. updated_at 触发器（复用 exchange_rates 迁移中定义的 set_updated_at 函数）
-- ────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS prices_set_updated_at ON public.prices;
CREATE TRIGGER prices_set_updated_at
  BEFORE UPDATE ON public.prices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS：匿名可读，无写入 policy（service_role 通过 bypass RLS 写入）
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'prices'
      AND policyname = 'Public Read Prices'
  ) THEN
    CREATE POLICY "Public Read Prices" ON public.prices
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Realtime publication（前端可订阅价格变化）
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.prices;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- 已加过，忽略
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. 种子数据（供前端开发期间使用；爬虫跑起来会覆盖 change/change_pct/updated_at）
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO public.prices (symbol, name, price, currency, change, change_pct, source)
VALUES
  ('WTI',    'WTI Crude',   91.06,   'USD', 0.00,  0.00, 'fred'),
  ('BRENT',  'Brent Crude', 103.40,  'USD', 0.00,  0.00, 'fred'),
  ('COPPER', 'Copper',      5.68,    'USD', 0.00,  0.00, 'fred'),
  ('GOLD',   'Gold',        2345.00, 'USD', 12.50, 0.53, 'fred'),
  ('SILVER', 'Silver',      27.50,   'USD', 0.35,  1.29, 'metals.dev')
ON CONFLICT (symbol) DO NOTHING;
