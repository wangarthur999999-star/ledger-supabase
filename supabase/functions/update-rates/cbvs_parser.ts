// supabase/functions/update-rates/cbvs_parser.ts
//
// Deno 版本的 CBVS 汇率页解析器。
// 和 scripts/lib/cbvs_parser.js 保持行为一致，两边需同步修改。
// 测试依赖放在 Node 侧 (scripts/__tests__)，通过把本文件 transpile 的 JS 视为等价实现来验证。

// @ts-ignore - Deno 中通过 URL 导入 cheerio
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';

export const CBVS_DAILY_URL =
  'https://www.cbvs.sr/en/statistics/financial-market-statistics/daily-publications';

export interface RatePair {
  buy: number;
  sell: number;
}

export interface ParsedRates {
  usd: RatePair | null;
  eur: RatePair | null;
}

/**
 * 归一化单个数值 token 成 number。
 * 见 scripts/lib/cbvs_parser.js 同名函数的详细说明。
 */
export function parseRate(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const m = s.match(/-?\d+(?:[.,]\d+)*/);
  if (!m) return null;
  let token = m[0];

  const hasComma = token.includes(',');
  const hasDot = token.includes('.');
  let normalized: string;
  if (hasComma && hasDot) {
    const lastComma = token.lastIndexOf(',');
    const lastDot = token.lastIndexOf('.');
    if (lastComma > lastDot) {
      normalized = token.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = token.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = token.replace(',', '.');
  } else {
    normalized = token;
  }

  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 100000) return null;
  return n;
}

function findPairInText(text: string, label: string): RatePair | null {
  const re = new RegExp(
    `${label}[^\\d-]*([\\d][\\d.,]*)[^\\d-]+([\\d][\\d.,]*)`,
    'i'
  );
  const m = text.match(re);
  if (!m) return null;
  const buy = parseRate(m[1]);
  const sell = parseRate(m[2]);
  if (buy == null || sell == null) return null;
  return { buy, sell };
}

export function parseCbvsDaily(html: string): ParsedRates {
  const $ = cheerio.load(html);

  let usd: RatePair | null = null;
  let eur: RatePair | null = null;

  $('table').each((_: number, table: any) => {
    const tableText = $(table).text();
    if (!/Bought/i.test(tableText) || !/Sold/i.test(tableText)) return;

    $(table)
      .find('tr')
      .each((_: number, tr: any) => {
        const cells: string[] = $(tr)
          .find('td, th')
          .map((_: number, el: any) => $(el).text().trim())
          .get();
        if (cells.length < 3) return;

        const label = cells[0];
        const nums: number[] = [];
        for (let i = 1; i < cells.length && nums.length < 2; i++) {
          const v = parseRate(cells[i]);
          if (v != null) nums.push(v);
        }
        if (nums.length < 2) return;

        const labelUpper = label.toUpperCase();
        if (!usd && /\bUSD\b|U\.?S\.?\s*DOLLAR/.test(labelUpper)) {
          usd = { buy: nums[0], sell: nums[1] };
        } else if (!eur && /\bEUR\b|EURO/.test(labelUpper)) {
          eur = { buy: nums[0], sell: nums[1] };
        }
      });
  });

  if (!usd || !eur) {
    const pageText = $('body').text().replace(/\s+/g, ' ');
    if (!usd) {
      usd =
        findPairInText(pageText, 'U\\.S\\. DOLLAR \\(per USD\\)') ||
        findPairInText(pageText, 'USD');
    }
    if (!eur) {
      eur =
        findPairInText(pageText, 'EUR \\(per EUR\\)') ||
        findPairInText(pageText, 'EUR');
    }
  }

  return { usd, eur };
}
