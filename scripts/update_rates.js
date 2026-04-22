// scripts/update_rates.js
//
// 在 GitHub Actions 中定时运行。
//
// 抓取两个数据源:
//   1. CBVS "Daily Publications" —— 官方汇率 (official_buy / official_sell)
//   2. Finabank "Koersen / Rates" —— 商业银行汇率，用作街头价代理 (street_buy / street_sell)
//
// 然后把两边合并后写入 Supabase 的 exchange_rates 表。
//
// 容错设计:
//   - CBVS 失败  -> 整个脚本失败退出 (official 是核心数据)
//   - Finabank 失败 -> 警告 + 退回旧估算 (官方价 × (1 + STREET_PREMIUM_PCT))，不阻塞官方价更新
//   - CBVS 只有 USD 没 EUR -> 只更新 USD，EUR 保持不变
//   - 同理 Finabank 缺一种时
//
// 环境变量:
//   SUPABASE_URL                必填
//   SUPABASE_SERVICE_ROLE_KEY   必填
//   CBVS_URL                    可选，覆盖默认 CBVS URL (测试用)
//   FINABANK_URL                可选，覆盖默认 Finabank URL (测试用)
//   STREET_PREMIUM_PCT          可选，Finabank 抓取失败时的回退溢价 (默认 2.5)
//   DRY_RUN                     "1" 时只打印不写库

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

import { CBVS_DAILY_URL, parseCbvsDaily } from './lib/cbvs_parser.js';
import { FINABANK_URL, parseFinabankRates } from './lib/finabank_parser.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CBVS_TARGET = process.env.CBVS_URL || CBVS_DAILY_URL;
const FINABANK_TARGET = process.env.FINABANK_URL || FINABANK_URL;
const DRY_RUN = process.env.DRY_RUN === '1';

const STREET_PREMIUM_FALLBACK = (() => {
  const raw = process.env.STREET_PREMIUM_PCT;
  if (raw == null || raw === '') return 0.025;
  const pct = parseFloat(raw);
  if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
    console.warn(`⚠️ 忽略非法 STREET_PREMIUM_PCT="${raw}"，使用默认 2.5%`);
    return 0.025;
  }
  return pct / 100;
})();

function requireEnv() {
  if (DRY_RUN) return;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ 缺少环境变量 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
}

async function fetchHtml(url) {
  const res = await axios.get(url, {
    timeout: 20000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    validateStatus: (s) => s >= 200 && s < 300,
  });
  return res.data;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/**
 * 构造单一货币对 (USD/SRD 或 EUR/SRD) 的写库 payload。
 *
 * @param {string} pair            e.g. 'USD / SRD'
 * @param {{buy, sell}} official   CBVS 抓到的官方买卖价 (必填)
 * @param {{buy, sell} | null} street  Finabank 抓到的街头价 (可为 null, null 时用溢价回退)
 * @param {number} changeDefault   当前 schema 要求的 change 列占位值
 * @param {string[]} warnings      累积警告 (用于最后统一打印)
 */
function buildRatePayload(pair, official, street, changeDefault, warnings) {
  let streetBuy, streetSell, source;
  if (street) {
    streetBuy = street.buy;
    streetSell = street.sell;
    source = 'finabank';
  } else {
    streetBuy = official.buy * (1 + STREET_PREMIUM_FALLBACK);
    streetSell = official.sell * (1 + STREET_PREMIUM_FALLBACK);
    source = `estimated (+${(STREET_PREMIUM_FALLBACK * 100).toFixed(1)}%)`;
    warnings.push(
      `${pair}: Finabank 数据缺失，街头价退回估算 (${source})`
    );
  }

  return {
    pair,
    official_buy: round3(official.buy),
    official_sell: round3(official.sell),
    street_buy: round3(streetBuy),
    street_sell: round3(streetSell),
    change: changeDefault,
    _streetSource: source, // 仅用于日志，不写库
  };
}

async function pushToSupabase(rate) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase
    .from('exchange_rates')
    .update({
      official_buy: rate.official_buy,
      official_sell: rate.official_sell,
      street_buy: rate.street_buy,
      street_sell: rate.street_sell,
      change: rate.change,
    })
    .eq('pair', rate.pair);

  if (error) {
    throw new Error(`Supabase update failed for ${rate.pair}: ${error.message}`);
  }
}

/**
 * 温和地抓取第二数据源: 失败不抛出, 返回 null + 打印警告。
 */
async function tryFetchFinabank() {
  try {
    console.log(`🏦 从 ${FINABANK_TARGET} 抓取 Finabank 汇率...`);
    const html = await fetchHtml(FINABANK_TARGET);
    const { usd, eur } = parseFinabankRates(html);
    if (!usd && !eur) {
      console.warn('⚠️ Finabank 页面解析到 0 条数据 (结构可能已改)，退回估算溢价');
      return { usd: null, eur: null };
    }
    console.log(`✅ Finabank 解析: USD=${usd ? `${usd.buy}/${usd.sell}` : 'n/a'}, EUR=${eur ? `${eur.buy}/${eur.sell}` : 'n/a'}`);
    return { usd, eur };
  } catch (err) {
    console.warn(`⚠️ Finabank 抓取失败 (${err.message})，街头价退回估算`);
    return { usd: null, eur: null };
  }
}

async function main() {
  requireEnv();

  // ---------- Step 1: CBVS (官方价，必须成功) ----------
  console.log(`🚀 从 ${CBVS_TARGET} 抓取 CBVS 汇率...`);
  const cbvsHtml = await fetchHtml(CBVS_TARGET);
  const cbvs = parseCbvsDaily(cbvsHtml);
  if (!cbvs.usd && !cbvs.eur) {
    throw new Error(
      'CBVS 页面解析失败: 未找到任何货币数据。页面结构可能已改变，请检查 parser。'
    );
  }
  console.log(`✅ CBVS 解析: USD=${cbvs.usd ? `${cbvs.usd.buy}/${cbvs.usd.sell}` : 'n/a'}, EUR=${cbvs.eur ? `${cbvs.eur.buy}/${cbvs.eur.sell}` : 'n/a'}`);

  // ---------- Step 2: Finabank (街头价，失败可降级) ----------
  const finabank = await tryFetchFinabank();

  // ---------- Step 3: 组装 payload ----------
  const warnings = [];
  const rates = [];

  if (cbvs.usd) {
    rates.push(buildRatePayload('USD / SRD', cbvs.usd, finabank.usd, 0.02, warnings));
  } else {
    warnings.push('USD: CBVS 未返回官方价，本次跳过更新');
  }

  if (cbvs.eur) {
    rates.push(buildRatePayload('EUR / SRD', cbvs.eur, finabank.eur, -0.01, warnings));
  } else {
    warnings.push('EUR: CBVS 未返回官方价，本次跳过更新');
  }

  console.log('📊 解析结果:');
  console.table(
    rates.map((r) => ({
      pair: r.pair,
      official_buy: r.official_buy,
      official_sell: r.official_sell,
      street_buy: r.street_buy,
      street_sell: r.street_sell,
      street_source: r._streetSource,
    }))
  );
  if (warnings.length) {
    console.warn('⚠️ 警告:');
    for (const w of warnings) console.warn(`   - ${w}`);
  }

  if (DRY_RUN) {
    console.log('🧪 DRY_RUN=1，跳过数据库写入');
    return;
  }

  // ---------- Step 4: 写库 ----------
  for (const rate of rates) {
    await pushToSupabase(rate);
    console.log(
      `✅ ${rate.pair} 已写入 (official ${rate.official_buy}/${rate.official_sell}, street ${rate.street_buy}/${rate.street_sell} [${rate._streetSource}])`
    );
  }
}

main().catch((err) => {
  console.error('🚨 更新失败:', err.message);
  process.exit(1);
});
