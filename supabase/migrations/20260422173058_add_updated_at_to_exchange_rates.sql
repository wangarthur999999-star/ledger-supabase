-- 给 exchange_rates 表加 updated_at 字段 + 自动维护触发器
-- 
-- 此迁移已于 2026-04-22 17:30 UTC 在生产库 Dashboard SQL Editor 中手动执行。
-- 此文件仅作 git 归档，便于未来重建数据库。

ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exchange_rates_set_updated_at ON public.exchange_rates;
CREATE TRIGGER exchange_rates_set_updated_at
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

UPDATE public.exchange_rates SET updated_at = now();
