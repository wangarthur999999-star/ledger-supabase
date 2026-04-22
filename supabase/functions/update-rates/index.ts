// supabase/functions/update-rates/index.ts
//
// Supabase Edge Function: 爬取 CBVS + Finabank 并更新 exchange_rates 表。
//
// 容错设计 (与 scripts/update_rates.js 对齐):
//   - CBVS 失败 -> 返回 500
//   - Finabank 失败 -> 记录警告 + 街头价退回估算溢价，仍 200
//   - 部分货币缺失 -> 跳过该货币的更新

// @ts-ignore Deno 远程 import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore Deno 远程 import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import { CBVS_DAILY_URL, parseCbvsDaily } from './cbvs_parser.ts';
import { FINABANK_URL, parseFinabankRates } from './finabank_parser.ts';

// @ts-ignore Deno 全局
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// @ts-ignore Deno 全局
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// @ts-ignore Deno 全局
const STREET_PREMIUM_PCT = parseFloat(Deno.env.get('STREET_PREMIUM_PCT') || '2.5');
const STREET_PREMIUM_FALLBACK =
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
  street_source: string; // 仅用于返回给调用方, 不会写库
}

function buildRatePayload(
  pair: string,
  official: { buy: number; sell: number },
  street: { buy: number; sell: number } | null,
  changeDefault: number
): RatePayload {
  let streetBuy: number, streetSell: number, streetSource: string;
  if (street) {
    streetBuy = street.buy;
    streetSell = street.sell;
    streetSource = 'finabank';
  } else {
    streetBuy = official.buy * (1 + STREET_PREMIUM_FALLBACK);
    streetSell = official.sell * (1 + STREET_PREMIUM_FALLBACK);
    streetSource = `estimated_${(STREET_PREMIUM_FALLBACK * 100).toFixed(1)}pct`;
  }
  return {
    pair,
    official_buy: round3(official.buy),
    official_sell: round3(official.sell),
    street_buy: round3(streetBuy),
    street_sell: round3(streetSell),
    change: changeDefault,
    street_source: streetSource,
  };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) {
    throw new Error(`fetch ${url} failed: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

async function tryFinabank(): Promise<{ usd: any; eur: any; error?: string }> {
  try {
    const html = await fetchText(FINABANK_URL);
    const parsed = parseFinabankRates(html);
    if (!parsed.usd && !parsed.eur) {
      return { usd: null, eur: null, error: 'parsed 0 rows' };
    }
    return parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { usd: null, eur: null, error: msg };
  }
}

serve(async (_req: Request) => {
  try {
    console.log(`🚀 fetching CBVS from ${CBVS_DAILY_URL}`);
    const cbvsHtml = await fetchText(CBVS_DAILY_URL);
    const cbvs = parseCbvsDaily(cbvsHtml);

    if (!cbvs.usd && !cbvs.eur) {
      throw new Error(
        'CBVS parsing failed: neither USD nor EUR found — page layout may have changed.'
      );
    }

    console.log(`🏦 fetching Finabank from ${FINABANK_URL}`);
    const finabank = await tryFinabank();
    if (finabank.error) {
      console.warn(`⚠️ Finabank source unavailable (${finabank.error}); using estimated premium`);
    }

    const rates: RatePayload[] = [];
    if (cbvs.usd) {
      rates.push(buildRatePayload('USD / SRD', cbvs.usd, finabank.usd, 0.02));
    }
    if (cbvs.eur) {
      rates.push(buildRatePayload('EUR / SRD', cbvs.eur, finabank.eur, -0.01));
    }

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
        finabank_error: finabank.error,
        skipped: {
          usd: !cbvs.usd ? 'not found in CBVS HTML' : undefined,
          eur: !cbvs.eur ? 'not found in CBVS HTML' : undefined,
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
