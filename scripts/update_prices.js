// scripts/update_prices.js
//
// 在 GitHub Actions 中定时运行（或手动触发）。
// 抓取商品价格数据并写入 Supabase prices 表。
//
// 数据源:
//   1. FRED API (https://fred.stlouisfed.org/docs/api/api_key.html)
//      - WTI:    DCOILWTICO      (WTI Crude Oil, USD/bbl)
//      - BRENT:  DCOILBRENTEU     (Brent Crude Oil, USD/bbl)
//      - COPPER: PCOPPUSDM        (Copper, USD/MT → 除以 2204.62 = USD/lb)
//      - GOLD:   WPUGOLD          (Producer Price Index: Gold, USD/oz 近似值)
//      - SILVER: WPUPMSILVER      (Producer Price Index: Silver, USD/oz 近似值)
//
// 环境变量:
//   SUPABASE_URL                必填
//   SUPABASE_SERVICE_ROLE_KEY   必填
//   FRED_API_KEY               必填 (从 fred.stlouisfed.org 注册获取)
//   DRY_RUN                    "1" 时只打印不写库

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// ─── 环境变量 ──────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FRED_API_KEY = process.env.FRED_API_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

// ─── FRED 数据系列配置 ───────────────
// unitFactor: FRED 返回值的单位转换因子（乘以该值得到目标单位）
const FRED_CONFIG = {
  WTI:    { seriesId: 'DCOILWTICO',   name: 'WTI Crude',     unitFactor: 1         },
  BRENT:  { seriesId: 'DCOILBRENTEU', name: 'Brent Crude',   unitFactor: 1         },
  COPPER: { seriesId: 'PCOPPUSDM',    name: 'Copper',        unitFactor: 1/2204.62 },
  GOLD:   { seriesId: 'WPUGOLD',       name: 'Gold',          unitFactor: 1         },
  SILVER: { seriesId: 'WPUPMSILVER',   name: 'Silver',        unitFactor: 1         },
};

// ─── Supabase 客户端 ───────────────────
let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

// ─── 工具函数 ──────────────────────────
function requireEnv() {
  if (DRY_RUN) return;
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!FRED_API_KEY) missing.push('FRED_API_KEY');
  if (missing.length) {
    console.error('❌ 缺少环境变量:', missing.join(', '));
    process.exit(1);
  }
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function fetchJson(url, config = {}) {
  const res = await axios({ url, timeout: 30000, ...config });
  return res.data;
}

// ─── FRED API 抓取 ─────────────────────
async function fetchFredPrice(seriesId, symbol) {
  console.log(`🏛️  FRED [${symbol}] series=${seriesId}`);
  const url = 'https://api.stlouisfed.org/fred/series/observations';
  const data = await fetchJson(url, {
    params: {
      series_id: seriesId,
      api_key: FRED_API_KEY,
      file_type: 'json',
      limit: 1,
      sort_order: 'desc',
    },
  });

  if (!data?.observations?.length) {
    throw new Error(`FRED ${seriesId} 返回空数据`);
  }

  const latest = data.observations[0];
  const rawValue = parseFloat(latest.value);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    throw new Error(`FRED ${seriesId} 返回非法数值: ${latest.value}`);
  }

  console.log(`   ✅ ${latest.date} → ${rawValue}`);
  return rawValue;
}

// ─── 数据库更新 ────────────────────────
async function updatePrice(symbol, newPrice, source) {
  const { data: current } = await getSupabase()
    .from('prices')
    .select('price')
    .eq('symbol', symbol)
    .maybeSingle();

  const oldPrice = current?.price || newPrice;
  const change = round2(newPrice - oldPrice);
  const changePct = oldPrice !== 0 ? round2((change / oldPrice) * 100) : 0;

  const payload = {
    price: newPrice,
    change,
    change_pct: changePct,
    source,
    updated_at: new Date().toISOString(),
  };

  if (DRY_RUN) {
    console.log(`   🧪 DRY_RUN [${symbol}]`, payload);
    return;
  }

  const { error } = await getSupabase()
    .from('prices')
    .update(payload)
    .eq('symbol', symbol);

  if (error) {
    throw new Error(`Supabase update failed for ${symbol}: ${error.message}`);
  }
}

// ─── 主流程 ────────────────────────────
async function main() {
  requireEnv();
  console.log('🚀 开始更新商品价格...\n');

  const results = [];
  const errors = [];

  // ── Step 1: FRED 数据 ──
  for (const [symbol, cfg] of Object.entries(FRED_CONFIG)) {
    try {
      const rawPrice = await fetchFredPrice(cfg.seriesId, symbol);
      const price = round2(rawPrice * cfg.unitFactor);
      await updatePrice(symbol, price, 'fred');
      results.push({ symbol, price, source: 'fred', status: '✅' });
    } catch (err) {
      console.error(`   ❌ ${symbol}: ${err.message}`);
      errors.push({ symbol, error: err.message });
    }
  }

  // ── 汇总 ──
  console.log('\n📊 更新结果:');
  console.table(results);

  if (errors.length) {
    console.warn('\n⚠️ 失败项:');
    errors.forEach(e => console.warn(`   - ${e.symbol}: ${e.error}`));
  }

  if (!results.length) {
    console.error('\n🚨 没有任何商品价格更新成功');
    process.exit(1);
  }

  console.log(`\n🎉 完成: ${results.length} 成功, ${errors.length} 失败`);
}

main().catch(err => {
  console.error('\n🚨 脚本异常:', err.message);
  process.exit(1);
});
