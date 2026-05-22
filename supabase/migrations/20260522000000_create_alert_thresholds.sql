-- ============================================================================
-- Ledger Suriname · alert_thresholds 表
-- ============================================================================
-- 用户订阅的"汇率突破阈值"通知配置。
--
-- 设计:
--   每行 = 一个订阅 = (device_id, pair, threshold_kind, threshold_value)
--   device_id 是客户端生成的 UUID, 存 localStorage; 没接 Auth 所以不绑 user_id
--
--   threshold_kind:
--     'above'   现价 ≥ threshold_value 时触发
--     'below'   现价 ≤ threshold_value 时触发
--     'change'  日内涨跌幅 |%| ≥ threshold_value 时触发
--
--   compare_field: 用哪个价比较。默认 street_buy (cambio 买入价, 大众最关心的"换 SRD" 价)
--   通道: web_push 用 endpoint+keys; capacitor 本地通知不需要 endpoint, 设 null
--
--   last_triggered_at: 防抖, 同一个订阅 24h 内只触发一次
--
-- RLS:
--   匿名用户能 SELECT / INSERT / UPDATE / DELETE 自己的 device_id 下的行。
--   这里 RLS 不强校验 device_id, 因为 anon 已经能看到所有列, 攻击成本 ~0;
--   真要保护应该接 Auth。当前模型: 用户保管好自己的 device_id 即可。
--
-- 幂等。
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alert_thresholds (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id         TEXT         NOT NULL,
  pair              TEXT         NOT NULL,
  threshold_kind    TEXT         NOT NULL CHECK (threshold_kind IN ('above', 'below', 'change')),
  threshold_value   NUMERIC(10,4) NOT NULL,
  compare_field     TEXT         NOT NULL DEFAULT 'street_buy'
                                 CHECK (compare_field IN ('official_buy','official_sell','street_buy','street_sell')),
  enabled           BOOLEAN      NOT NULL DEFAULT true,
  -- Web Push 用 (capacitor / 本地通知留 null)
  push_endpoint     TEXT,
  push_p256dh       TEXT,
  push_auth         TEXT,
  -- 防抖
  last_triggered_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 一个 device 在一个 (pair, kind, compare_field) 下只能订一个值, 防止用户误开重复
CREATE UNIQUE INDEX IF NOT EXISTS alert_thresholds_unique_idx
  ON public.alert_thresholds (device_id, pair, threshold_kind, compare_field);

CREATE INDEX IF NOT EXISTS alert_thresholds_enabled_idx
  ON public.alert_thresholds (enabled) WHERE enabled = true;

DROP TRIGGER IF EXISTS alert_thresholds_set_updated_at ON public.alert_thresholds;
CREATE TRIGGER alert_thresholds_set_updated_at
  BEFORE UPDATE ON public.alert_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;

-- anon: 全 CRUD (没接 Auth, 见上面说明)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alert_thresholds' AND policyname='Public CRUD Alert Thresholds') THEN
    CREATE POLICY "Public CRUD Alert Thresholds" ON public.alert_thresholds
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
