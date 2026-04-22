// supabase/functions/update-rates/index.ts
//
// Supabase Edge Function: 爬取 CBVS 并更新 exchange_rates 表。
// 可被 cron (pg_cron / scheduled function) 或手动 HTTP 调用触发。
//
// 与 scripts/update_rates.js 行为对齐, 共享 ./cbvs_parser.ts 解析逻辑。
// 关键修复: 解析失败时返回 5xx (不再因为 catch 吞掉而写入假数据)。

// @ts-ignore Deno 远程 import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore Deno 远程 import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import { CBVS_DAILY_URL, parseCbvsDaily } from './cbvs_parser.ts';

// @ts-ignore Deno 全局
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// @ts-ignore Deno 全局
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// @ts-ignore Deno 全局
const STREET_PREMIUM_PCT = parseFloat(Deno.env.get('STREET_PREMIUM_PCT') || '2.5');
const STREET_PREMIUM =
  Number.isFinite(STREET_PREMIUM_PCT) &&
  STREET_PREMIUM_PCT >= 0 &&
  STREET_PREMIUM_PCT <= 50
    ? STREET_PREMIUM_PCT / 100
    : 0.025;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

interface RatePayload {
  pair: string;
  official_buy: number;
  official_sell: number;
  street_buy: number;
  street_sell: number;
  change: number;
}

function buildRatePayload(
  pair: string,
  official: { buy: number; sell: number },
  changeDefault: number
): RatePayload {
  return {
    pair,
    official_buy: round3(official.buy),
    official_sell: round3(official.sell),
    street_buy: round3(official.buy * (1 + STREET_PREMIUM)),
    street_sell: round3(official.sell * (1 + STREET_PREMIUM)),
    change: changeDefault,
  };
}

serve(async (_req: Request) => {
  try {
    console.log(`🚀 fetching CBVS from ${CBVS_DAILY_URL}`);

    const res = await fetch(CBVS_DAILY_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      throw new Error(`CBVS fetch failed: ${res.status} ${res.statusText}`);
    }
    const html = await res.text();
    const { usd, eur } = parseCbvsDaily(html);

    if (!usd && !eur) {
      throw new Error(
        'CBVS parsing failed: neither USD nor EUR found — page layout may have changed.'
      );
    }

    const rates: RatePayload[] = [];
    if (usd) rates.push(buildRatePayload('USD / SRD', usd, 0.02));
    if (eur) rates.push(buildRatePayload('EUR / SRD', eur, -0.01));

    const results: { pair: string; ok: boolean; error?: string }[] = [];
    for (const rate of rates) {
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
      results.push({ pair: rate.pair, ok: !error, error: error?.message });
    }

    const allOk = results.every((r) => r.ok);
    return new Response(
      JSON.stringify({
        success: allOk,
        rates,
        results,
        skipped: {
          usd: !usd ? 'not found in HTML' : undefined,
          eur: !eur ? 'not found in HTML' : undefined,
        },
      }),
      {
        status: allOk ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('🚨 update-rates failed:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
