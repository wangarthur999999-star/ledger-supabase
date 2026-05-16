-- ============================================================================
-- Ledger Suriname · Task B4 · Prices Revamp
-- ============================================================================
-- 改动:
--   1. ADD COLUMN unit  (USD/bbl, USD/lb, USD/oz, USD/MMBtu, cents/lb 等)
--   2. DELETE COPPER 行 (跟苏里南关联弱,改用 ALUMINUM)
--   3. UPDATE 已有的 WTI/BRENT/GOLD/SILVER 的 unit + GOLD/SILVER 的 source
--   4. NOT INSERT 新行 - 让 update_prices.js 的 upsert 自然 INSERT,避免死数据
--
-- 跑这个文件之后,UI 上预期看到 4 张卡: WTI, BRENT, GOLD, SILVER
-- (COPPER 消失,NATGAS/ALUMINUM/RICE/SUGAR/WHEAT/COFFEE/SOYBEAN_OIL 等下次 cron)
--
-- 幂等性:全部 IF NOT EXISTS / UPDATE / DELETE,可重复跑不报错
-- 注意:此 migration 已于 2026-05-03 在 Supabase Dashboard 跑过,本文件仅作仓库记录。
-- ============================================================================

-- ───────────────────────────────────────────────────────────────────────────
-- 1. 加 unit 列 (默认 'USD',兜底已有行)
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.prices
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'USD';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. 删除 COPPER (B4 决定砍掉,跟苏里南关联弱)
-- ───────────────────────────────────────────────────────────────────────────
DELETE FROM public.prices WHERE symbol = 'COPPER';

-- ───────────────────────────────────────────────────────────────────────────
-- 3. 已有行的 unit / source 修正
-- ───────────────────────────────────────────────────────────────────────────
UPDATE public.prices SET unit = 'USD/bbl' WHERE symbol = 'WTI';
UPDATE public.prices SET unit = 'USD/bbl' WHERE symbol = 'BRENT';
UPDATE public.prices SET unit = 'USD/oz', source = 'metals.dev' WHERE symbol = 'GOLD';
UPDATE public.prices SET unit = 'USD/oz', source = 'metals.dev' WHERE symbol = 'SILVER';

-- ───────────────────────────────────────────────────────────────────────────
-- 4. 不在此处 INSERT 新行 (NATGAS/ALUMINUM/RICE/SUGAR/WHEAT/COFFEE/SOYBEAN_OIL)
--    update_prices.js 首次跑时会自然 upsert INSERT,避免引入死数据
-- ───────────────────────────────────────────────────────────────────────────
