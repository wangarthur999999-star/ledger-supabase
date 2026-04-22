// scripts/update_rates.js
//
// 在 GitHub Actions 中定时运行：
//   1. 抓取 CBVS Daily Publications 页面
//   2. 解析 USD / EUR 的官方买/卖价
//   3. 推送到 Supabase 的 exchange_rates 表
//
// 设计决策:
//   - 解析逻辑抽离到 ./lib/cbvs_parser.js，和 Supabase Edge Function 共享逻辑。
//   - 街头价 (street_buy / street_sell) 目前以官方价 +2.5% 估算, 因为 CBVS 不提供。
//     生产上应从 cme.sr 这类民间 cambio 网站抓取, 这里标了 TODO。
//   - 失败策略: 抓取或解析失败时进程以非 0 退出码退出 (CI 会记录失败并报警),
//     而不是用假数据悄悄更新数据库 (这是之前版本的 bug)。
//   - 当只有一种货币解析成功时, 另一种保持不更新, 不污染数据。
//
// 环境变量:
//   SUPABASE_URL                必填
//   SUPABASE_SERVICE_ROLE_KEY   必填
//   CBVS_URL                    可选，默认 CBVS_DAILY_URL, 覆盖用于测试
//   DRY_RUN                     "1" 时只打印不写库

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

import { CBVS_DAILY_URL, parseCbvsDaily } from './lib/cbvs_parser.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.CBVS_URL || CBVS_DAILY_URL;
const DRY_RUN = process.env.DRY_RUN === '1';

// 街头价相对官方价的溢价。
// 当前是估算值（CBVS 不提供民间 cambio 报价，cme.sr 有 bot 防护无法稳定爬取）。
// 通过环境变量 STREET_PREMIUM_PCT 覆盖 (单位: 百分比, 例: "2.5" 表示 +2.5%)。
// TODO: 对接可靠的民间 cambio 数据源后，移除此估算。
const STREET_PREMIUM = (() => {
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

function buildRatePayload(pair, official, changeDefault) {
  return {
    pair,
    official_buy: round3(official.buy),
    official_sell: round3(official.sell),
    street_buy: round3(official.buy * (1 + STREET_PREMIUM)),
    street_sell: round3(official.sell * (1 + STREET_PREMIUM)),
    change: changeDefault,
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

async function main() {
  requireEnv();

  console.log(`🚀 从 ${TARGET_URL} 抓取 CBVS 汇率...`);
  const html = await fetchHtml(TARGET_URL);
  const { usd, eur } = parseCbvsDaily(html);

  if (!usd && !eur) {
    throw new Error(
      'CBVS 页面解析失败: 未找到任何货币数据。页面结构可能已改变，请检查 parser。'
    );
  }

  const rates = [];
  if (usd) rates.push(buildRatePayload('USD / SRD', usd, 0.02));
  else console.warn('⚠️ 未解析到 USD，本次跳过 USD 更新');

  if (eur) rates.push(buildRatePayload('EUR / SRD', eur, -0.01));
  else console.warn('⚠️ 未解析到 EUR，本次跳过 EUR 更新');

  console.log('📊 解析结果:');
  console.table(rates);

  if (DRY_RUN) {
    console.log('🧪 DRY_RUN=1，跳过数据库写入');
    return;
  }

  for (const rate of rates) {
    await pushToSupabase(rate);
    console.log(
      `✅ ${rate.pair} 已写入 (official ${rate.official_buy} / ${rate.official_sell})`
    );
  }
}

main().catch((err) => {
  console.error('🚨 更新失败:', err.message);
  process.exit(1);
});
