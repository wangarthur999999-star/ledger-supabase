-- ============================================================================
-- Ledger Suriname · exchange_rates.change 字段语义修复
-- ============================================================================
-- 问题: change NUMERIC(5,2) NOT NULL 不允许 null, 所以 update_rates.js 的
--       computeChange 在三种情况都返回 0:
--         a) 真实涨跌为 0% (合法)
--         b) 没有 history 数据 (首次写入 / 新币种)
--         c) computeChange 查询失败
--       UI 没法区分 "真 0%" 和 "数据缺失"。
--
-- 修复: 允许 change 为 null。爬虫在情况 (b)/(c) 写 null, UI 显示 "—" (现已支持);
--       真实 0% 才写 0, UI 显示 "0%"。
--
-- 此 migration 仅放宽 NOT NULL, 不动 update_rates.js 的当前行为
-- (它仍写 0)。爬虫升级到写 null 时也不会破坏老前端。
-- ============================================================================

ALTER TABLE public.exchange_rates
  ALTER COLUMN change DROP NOT NULL;
