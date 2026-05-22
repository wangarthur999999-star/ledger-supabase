-- ============================================================================
-- Ledger Suriname · 主 Schema
-- ============================================================================
-- 此文件用于从零重建数据库 (新 Supabase 项目)。生产库已通过 migrations/ 增量
-- 演化, 不要在已有库里重跑此文件。
--
-- 注:
--   · products / product_prices / folders 表已移除 (README 列为非目标)
--   · user_profiles 表也已移除: 没接 Supabase Auth, RLS 永远 false; 实际数据
--     存 localStorage (见 src/api/profile.ts)
--   · 所有表强制启用 RLS, anon key 仅可 SELECT, 写入走 service_role
--
-- 表清单:
--   · exchange_rates           最新 USD/EUR vs SRD 汇率 (单行 per pair)
--   · exchange_rates_history   汇率快照, 用于 change 计算
--   · prices                   大宗商品价格 (FRED + metals.dev)
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. 共享触发器: 自动维护 updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. exchange_rates
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pair          TEXT          NOT NULL UNIQUE,
  full_name     TEXT          NOT NULL,
  official_buy  NUMERIC(10,2) NOT NULL,
  official_sell NUMERIC(10,2) NOT NULL,
  street_buy    NUMERIC(10,2) NOT NULL,
  street_sell   NUMERIC(10,2) NOT NULL,
  -- null 表示数据缺失 (首次写入 / 计算失败), UI 显示 "—" 而非 0%
  change        NUMERIC(5,2),
  symbol        TEXT          NOT NULL,
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS exchange_rates_set_updated_at ON public.exchange_rates;
CREATE TRIGGER exchange_rates_set_updated_at
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exchange_rates'
      AND policyname = 'Public Read Exchange Rates'
  ) THEN
    CREATE POLICY "Public Read Exchange Rates" ON public.exchange_rates
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exchange_rates;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed (开发期间使用; 爬虫第一次跑会覆盖)
INSERT INTO public.exchange_rates (pair, full_name, official_buy, official_sell, street_buy, street_sell, change, symbol) VALUES
  ('USD / SRD', 'Amerikaanse Dollar', 38.15, 38.55, 38.90, 39.45, NULL, '$'),
  ('EUR / SRD', 'Europese Euro',      41.20, 41.60, 42.05, 42.60, NULL, '€')
ON CONFLICT (pair) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. exchange_rates_history
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exchange_rates_history (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pair          TEXT          NOT NULL,
  official_buy  NUMERIC(10,2) NOT NULL,
  official_sell NUMERIC(10,2) NOT NULL,
  street_buy    NUMERIC(10,2) NOT NULL,
  street_sell   NUMERIC(10,2) NOT NULL,
  recorded_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exchange_rates_history_pair_recorded_at_idx
  ON public.exchange_rates_history (pair, recorded_at DESC);

ALTER TABLE public.exchange_rates_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exchange_rates_history'
      AND policyname = 'Public Read Exchange Rates History'
  ) THEN
    CREATE POLICY "Public Read Exchange Rates History" ON public.exchange_rates_history
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. prices
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prices (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol     TEXT          NOT NULL UNIQUE,
  name       TEXT          NOT NULL,
  price      NUMERIC(12,4) NOT NULL CHECK (price > 0),
  currency   TEXT          DEFAULT 'USD',
  unit       TEXT          NOT NULL DEFAULT 'USD',
  change     NUMERIC(12,4),
  change_pct NUMERIC(10,4),
  source     TEXT          NOT NULL,
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS prices_set_updated_at ON public.prices;
CREATE TRIGGER prices_set_updated_at
  BEFORE UPDATE ON public.prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prices'
      AND policyname = 'Public Read Prices'
  ) THEN
    CREATE POLICY "Public Read Prices" ON public.prices
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.prices;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
