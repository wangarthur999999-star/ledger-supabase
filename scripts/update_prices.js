// scripts/update_prices.js
//
// 在 GitHub Actions 中定时运行(或手动触发)。
// 抓取商品价格数据并写入 Supabase prices 表。
//
// 数据源:
//
//   FRED API (https://fred.stlouisfed.org/docs/api/api_key.html)
//     日度:
//       WTI:    DCOILWTICO       (USD/bbl)
//       BRENT:  DCOILBRENTEU     (USD/bbl)
//       NATGAS: DHHNGSP          (USD/MMBtu)
//     月度(change 大部分时间为 0,前端会打 Monthly 标签):
//       ALUMINUM:    PALUMUSDM     (USD/MT  → 1/2204.62 = USD/lb)
//       RICE:        PRICENPQUSDM  (USD/MT  → 1/2204.62 = USD/lb,泰国基准)
//       SUGAR:       PSUGAISAUSDM  (cents/lb → ×0.01    = USD/lb,ISA 基准)
//       WHEAT:       PWHEAMTUSDM   (USD/MT  → 1/2204.62 = USD/lb)
//       COFFEE:      PCOFFOTMUSDM  (USD/lb,无需转换)
//       SOYBEAN_OIL: PSOILUSDM     (USD/MT  → 1/2204.62 = USD/lb)
//
//   metals.dev (https://api.metals.dev/)
//     GOLD:   USD/oz (troy ounce)
//     SILVER: USD/oz (troy ounce)
//     免费版 100 requests/月,我们用 60/月(2 metal × 30 day)。
//     注意:metals.dev 直接返回 change 和 change_percent,我们直接用,
//          不像 FRED 那样自己算 (newPrice - oldPrice)。
//
// 环境变量:
//   SUPABASE_URL                必填
//   SUPABASE_SERVICE_ROLE_KEY   必填
//   FRED_API_KEY                必填
//   METALS_DEV_API_KEY          必填
//   DRY_RUN                     "1" 时只打印不写库

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { fileURLToPath } from 'url';

// ─── 环境变量 ──────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FRED_API_KEY = process.env.FRED_API_KEY;
const METALS_DEV_API_KEY = process.env.METALS_DEV_API_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

// ─── FRED 数据系列配置 ─────────────────
// unitFactor: FRED 返回值 → 目标单位 的转换因子
// frequency:  'daily' | 'monthly',前端 UI 用来打标签
export const FRED_CONFIG = {
  WTI:         { seriesId: 'DCOILWTICO',    name: 'WTI Crude',    unit: 'USD/bbl',   unitFactor: 1,         frequency: 'daily'   },
  BRENT:       { seriesId: 'DCOILBRENTEU',  name: 'Brent Crude',  unit: 'USD/bbl',   unitFactor: 1,         frequency: 'daily'   },
  NATGAS:      { seriesId: 'DHHNGSP',       name: 'Natural Gas',  unit: 'USD/MMBtu', unitFactor: 1,         frequency: 'daily'   },
  ALUMINUM:    { seriesId: 'PALUMUSDM',     name: 'Aluminum',     unit: 'USD/lb',    unitFactor: 1/2204.62, frequency: 'monthly' },
  RICE:        { seriesId: 'PRICENPQUSDM',  name: 'Rice',         unit: 'USD/lb',    unitFactor: 1/2204.62, frequency: 'monthly' },
  SUGAR:       { seriesId: 'PSUGAISAUSDM',  name: 'Sugar',        unit: 'USD/lb',    unitFactor: 0.01,      frequency: 'monthly' },
  WHEAT:       { seriesId: 'PWHEAMTUSDM',   name: 'Wheat',        unit: 'USD/lb',    unitFactor: 1/2204.62, frequency: 'monthly' },
  COFFEE:      { seriesId: 'PCOFFOTMUSDM',  name: 'Coffee',       unit: 'USD/lb',    unitFactor: 0.01,      frequency: 'monthly' },
  SOYBEAN_OIL: { seriesId: 'PSOILUSDM',     name: 'Soybean Oil',  unit: 'USD/lb',    unitFactor: 1/2204.62, frequency: 'monthly' },
};

// ─── metals.dev 数据系列配置 ─────────────
// metals.dev API 返回 rate.price / rate.change / rate.change_percent
// 我们直接用 API 返回的 change(不像 FRED 那样自己算)。
export const METALS_DEV_CONFIG = {
  GOLD:   { metal: 'gold',   name: 'Gold',   unit: 'USD/oz' },
  SILVER: { metal: 'silver', name: 'Silver', unit: 'USD/oz' },
};

// ─── Supabase 客户端 ─────────────────────
let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

// ─── 工具函数 ──────────────────────────
export function requireEnv() {
  if (DRY_RUN) return;
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!FRED_API_KEY) missing.push('FRED_API_KEY');
  if (!METALS_DEV_API_KEY) missing.push('METALS_DEV_API_KEY');
  if (missing.length) {
    const msg = '❌ 缺少环境变量: ' + missing.join(', ');
    console.error(msg);
    throw new Error(msg);
  }
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function round4(n) {
  return Math.round(n * 10000) / 10000;
}

async function fetchJson(url, config = {}) {
  const res = await axios({ url, timeout: 30000, ...config });
  return res.data;
}

// ─── FRED API 抓取 ─────────────────────
// DRY_RUN 模拟数据(单位与 FRED API 返回值一致,即转换前的原始单位)
const MOCK_FRED_PRICES = {
  WTI:         75.43,    // USD/bbl
  BRENT:       79.87,    // USD/bbl
  NATGAS:      2.85,     // USD/MMBtu
  ALUMINUM:    2400.00,  // USD/MT  → ~1.09 USD/lb
  RICE:        650.00,   // USD/MT  → ~0.29 USD/lb
  SUGAR:       21.50,    // ¢/lb    → ~0.215 USD/lb
  WHEAT:       240.00,   // USD/MT  → ~0.11 USD/lb
  COFFEE:      4.50,     // USD/lb  (already)
  SOYBEAN_OIL: 1100.00,  // USD/MT  → ~0.50 USD/lb
};

export async function fetchFredPrice(seriesId, symbol) {
  if (DRY_RUN) {
    const mockPrice = MOCK_FRED_PRICES[symbol];
    if (mockPrice == null) throw new Error(`No mock price for ${symbol}`);
    console.log(`🏛️  FRED [${symbol}] series=${seriesId} [DRY_RUN 模拟数据]`);
    console.log(`   ✅ 2026-04-XX → ${mockPrice}`);
    return mockPrice;
  }

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

// ─── metals.dev API 抓取 ────────────────
// 端点: https://api.metals.dev/v1/metal/spot?api_key=XXX&metal=gold&currency=USD&unit=toz
// 返回: { status, timestamp, currency, unit, metal, rate: { price, ask, bid, high, low, change, change_percent } }
//
// DRY_RUN 模拟数据(跟真实 API 返回结构一致)
const MOCK_METALS_DEV = {
  GOLD:   { price: 4614.1,  change: -8.32,  change_percent: -0.18 },
  SILVER: { price: 75.3495, change: 1.591,  change_percent: 2.16  },
};

export async function fetchMetalsDevSpot(metal, symbol) {
  if (DRY_RUN) {
    const mock = MOCK_METALS_DEV[symbol];
    if (!mock) throw new Error(`No mock metals.dev data for ${symbol}`);
    console.log(`🪙  metals.dev [${symbol}] metal=${metal} [DRY_RUN 模拟数据]`);
    console.log(`   ✅ price=${mock.price} change=${mock.change} change_percent=${mock.change_percent}`);
    return mock;
  }

  console.log(`🪙  metals.dev [${symbol}] metal=${metal}`);
  const url = 'https://api.metals.dev/v1/metal/spot';
  const data = await fetchJson(url, {
    params: {
      api_key: METALS_DEV_API_KEY,
      metal,
      currency: 'USD',
      unit: 'toz',
    },
  });

  if (data?.status !== 'success' || !data?.rate) {
    throw new Error(`metals.dev ${metal} 返回异常: ${JSON.stringify(data)}`);
  }

  const { price, change, change_percent } = data.rate;
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`metals.dev ${metal} 返回非法价格: ${price}`);
  }

  console.log(`   ✅ price=${price} change=${change} change_percent=${change_percent}`);
  return { price, change, change_percent };
}

// ─── 共享: 写一条历史快照 ────────────────
// 同时被 upsertFredPrice 和 upsertMetalsDevPrice 调用。
// 失败不抛: 历史是辅助数据, 不应该让主流程挂掉。Sentry 日志足够事后排查。
async function appendPriceHistory(symbol, price) {
  if (DRY_RUN) return;
  try {
    const { error } = await getSupabase().from('prices_history').insert({ symbol, price });
    if (error) console.warn(`   ⚠️  history insert 失败 ${symbol}: ${error.message}`);
  } catch (err) {
    console.warn(`   ⚠️  history insert 异常 ${symbol}: ${err.message}`);
  }
}

// ─── FRED 商品入库 (自己算 change) ──────
async function upsertFredPrice(symbol, newPrice) {
  const cfg = FRED_CONFIG[symbol];

  if (DRY_RUN) {
    const mockPayload = {
      symbol, name: cfg.name, price: newPrice, unit: cfg.unit,
      change: 0, change_pct: 0,
      source: 'fred', updated_at: new Date().toISOString(),
    };
    console.log(`   🧪 DRY_RUN [${symbol}]`, mockPayload);
    return;
  }

  // 读当前价用于算 change
  const { data: current, error: selectError } = await getSupabase()
    .from('prices').select('price').eq('symbol', symbol).maybeSingle();
  if (selectError) throw new Error(`Supabase select failed for ${symbol}: ${selectError.message}`);

  const oldPrice = current?.price ?? newPrice;

  // 月度数据优化: 当前值跟库里完全一样, 跳过 upsert + history。
  // FRED 月度系列每月只更新一次, 同月内每日 cron 拿到的 latest 都是同一行,
  // 之前每次都重写一遍, 浪费 Supabase 写入 + Realtime 广播 (会假触发前端订阅)。
  if (cfg.frequency === 'monthly' && current && Number(oldPrice).toFixed(4) === Number(newPrice).toFixed(4)) {
    console.log(`   ⏭️  ${symbol}: 月度价格未变 (${newPrice}), 跳过 upsert`);
    return;
  }

  const change = round4(newPrice - oldPrice);
  const changePct = oldPrice !== 0 ? round4((change / oldPrice) * 100) : 0;

  const payload = {
    symbol,
    name: cfg.name,
    price: newPrice,
    unit: cfg.unit,
    change,
    change_pct: changePct,
    source: 'fred',
    updated_at: new Date().toISOString(),
  };

  const { error } = await getSupabase()
    .from('prices').upsert(payload, { onConflict: 'symbol' });
  if (error) throw new Error(`Supabase upsert failed for ${symbol}: ${error.message}`);

  // 写历史快照 (sparkline 用)
  await appendPriceHistory(symbol, newPrice);
}

// ─── metals.dev 商品入库 (用 API 返回的 change) ──
async function upsertMetalsDevPrice(symbol, spot) {
  const cfg = METALS_DEV_CONFIG[symbol];
  const price = round4(spot.price);
  const change = Number.isFinite(spot.change) ? round4(spot.change) : null;
  const changePct = Number.isFinite(spot.change_percent) ? round4(spot.change_percent) : null;

  if (DRY_RUN) {
    const mockPayload = {
      symbol, name: cfg.name, price, unit: cfg.unit,
      change, change_pct: changePct,
      source: 'metals.dev', updated_at: new Date().toISOString(),
    };
    console.log(`   🧪 DRY_RUN [${symbol}]`, mockPayload);
    return;
  }

  const payload = {
    symbol,
    name: cfg.name,
    price,
    unit: cfg.unit,
    change,
    change_pct: changePct,
    source: 'metals.dev',
    updated_at: new Date().toISOString(),
  };

  const { error } = await getSupabase()
    .from('prices').upsert(payload, { onConflict: 'symbol' });
  if (error) throw new Error(`Supabase upsert failed for ${symbol}: ${error.message}`);

  // 写历史快照
  await appendPriceHistory(symbol, price);
}

// ─── 主流程 ──────────────────────────
export async function main() {
  requireEnv();
  console.log('🚀 开始更新商品价格...\n');

  const results = [];
  const errors = [];

  // ─── FRED 商品(9 个)───────────────
  // 之前是 for...of await 串行: 9 个 round-trip ~5s。改并行后 ~1s。
  // FRED API 限额是 120 req/min, 同时 9 个完全在限内。
  // 每个 task 独立 try/catch, 单个失败不影响其它。
  console.log('--- FRED ---');
  const fredTasks = Object.entries(FRED_CONFIG).map(async ([symbol, cfg]) => {
    try {
      const rawPrice = await fetchFredPrice(cfg.seriesId, symbol);
      const price = round4(rawPrice * cfg.unitFactor);
      await upsertFredPrice(symbol, price);
      return { symbol, price, unit: cfg.unit, source: 'fred', status: '✅' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ ${symbol}: ${message}`);
      errors.push({ symbol, source: 'fred', error: message });
      return null;
    }
  });
  const fredResults = await Promise.all(fredTasks);
  for (const r of fredResults) if (r) results.push(r);

  // ─── metals.dev 商品(2 个)──────────
  // 也并行: 只有 2 个但顺手统一风格
  console.log('\n--- metals.dev ---');
  const metalsTasks = Object.entries(METALS_DEV_CONFIG).map(async ([symbol, cfg]) => {
    try {
      const spot = await fetchMetalsDevSpot(cfg.metal, symbol);
      await upsertMetalsDevPrice(symbol, spot);
      return { symbol, price: round4(spot.price), unit: cfg.unit, source: 'metals.dev', status: '✅' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ ${symbol}: ${message}`);
      errors.push({ symbol, source: 'metals.dev', error: message });
      return null;
    }
  });
  const metalsResults = await Promise.all(metalsTasks);
  for (const r of metalsResults) if (r) results.push(r);

  // ─── 汇总 ─────────────────────────
  console.log('\n📊 更新结果:');
  console.table(results);

  if (errors.length) {
    console.warn('\n⚠️ 失败项:');
    errors.forEach(e => console.warn(`   - [${e.source}] ${e.symbol}: ${e.error}`));
  }

  if (!results.length) {
    throw new Error('没有任何商品价格更新成功');
  }

  console.log(`\n🎉 完成: ${results.length} 成功, ${errors.length} 失败`);
  return { results, errors };
}

// 只有直接运行时才执行 main;被 import 时(如测试)不执行
const scriptPath = fileURLToPath(import.meta.url);
const isDirectRun = scriptPath === process.argv[1] ||
                    scriptPath.endsWith(process.argv[1]);

if (isDirectRun) {
  main().catch(err => {
    console.error('\n🚨 脚本异常:', err.message);
    process.exit(1);
  });
}
