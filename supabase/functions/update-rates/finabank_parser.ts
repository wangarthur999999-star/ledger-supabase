// supabase/functions/update-rates/finabank_parser.ts
//
// Deno 版本的 Finabank 汇率页解析器。
// 和 scripts/lib/finabank_parser.js 保持行为一致，两边需同步修改。

// @ts-ignore - Deno 中通过 URL 导入 cheerio
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';
import { parseRate } from './cbvs_parser.ts';

export const FINABANK_URL =
  'https://www.finabanknv.com/service-desk/koersen-rates/';

export interface RatePair {
  buy: number;
  sell: number;
}

export interface ParsedFinabankRates {
  usd: RatePair | null;
  eur: RatePair | null;
}

export function parseFinabankRates(html: string): ParsedFinabankRates {
  const $ = cheerio.load(html);

  let usd: RatePair | null = null;
  let eur: RatePair | null = null;

  $('table').each((_: number, table: any) => {
    const tableText = $(table).text();
    if (!/Aankoop/i.test(tableText) || !/Verkoop/i.test(tableText)) return;

    $(table)
      .find('tr')
      .each((_: number, tr: any) => {
        const cells: string[] = $(tr)
          .find('td, th')
          .map((_: number, el: any) => $(el).text().trim())
          .get();
        if (cells.length < 3) return;

        const label = cells[0].toUpperCase();
        const nums: number[] = [];
        for (let i = 1; i < cells.length && nums.length < 2; i++) {
          const v = parseRate(cells[i]);
          if (v != null) nums.push(v);
        }
        if (nums.length < 2) return;

        if (!usd && /\bUSD\b|U\.?S\.?\s*DOLLAR/.test(label)) {
          usd = { buy: nums[0], sell: nums[1] };
        } else if (!eur && /\bEUR\b|EURO/.test(label)) {
          eur = { buy: nums[0], sell: nums[1] };
        }
      });
  });

  return { usd, eur };
}
