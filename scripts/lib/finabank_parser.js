// scripts/lib/finabank_parser.js
//
// 从 Finabank "Koersen / Rates" 页面抽取当日商业银行买卖价。
// 用作"街头价" (street rate) 的代理数据源，取代原本的"官方价 × 1.025"估算。
//
// 数据源: https://www.finabanknv.com/service-desk/koersen-rates/
//
// 页面结构 (截至 2026-04):
//   一个带 Aankoop / Verkoop 表头的表格，行形如:
//     USD GIRAAL    37.223    37.753
//     EUR GIRAAL    43.699    44.394
//   "GIRAAL" = 账面/电汇; 这不是现金柜台价，但比 CBVS 官方价更贴近市场。

import * as cheerio from 'cheerio';

import { parseRate } from './cbvs_parser.js';

export const FINABANK_URL =
  'https://www.finabanknv.com/service-desk/koersen-rates/';

/**
 * 从 Finabank HTML 中抽取 USD 和 EUR 的 Aankoop/Verkoop。
 *
 * 策略:
 *   1) 找含 "Aankoop" 和 "Verkoop" 表头的表格
 *   2) 逐行检查首列 label: "USD" / "EUR" (容忍 "GIRAAL" 等修饰词)
 *   3) 取 label 之后的前两个可解析数字
 *
 * 失败时返回 null 占位，由调用方决定降级策略。
 *
 * @returns {{ usd: {buy, sell} | null, eur: {buy, sell} | null }}
 */
export function parseFinabankRates(html) {
  const $ = cheerio.load(html);

  let usd = null;
  let eur = null;

  $('table').each((_, table) => {
    const tableText = $(table).text();
    // Finabank 用荷语 "Aankoop" (买) / "Verkoop" (卖)
    if (!/Aankoop/i.test(tableText) || !/Verkoop/i.test(tableText)) return;

    $(table)
      .find('tr')
      .each((_, tr) => {
        const cells = $(tr)
          .find('td, th')
          .map((_, el) => $(el).text().trim())
          .get();
        if (cells.length < 3) return;

        const label = cells[0].toUpperCase();
        const nums = [];
        for (let i = 1; i < cells.length && nums.length < 2; i++) {
          const v = parseRate(cells[i]);
          if (v != null) nums.push(v);
        }
        if (nums.length < 2) return;

        // 匹配 "USD GIRAAL"、"USD"、"U.S. DOLLAR" 等各种写法
        if (!usd && /\bUSD\b|U\.?S\.?\s*DOLLAR/.test(label)) {
          usd = { buy: nums[0], sell: nums[1] };
        } else if (!eur && /\bEUR\b|EURO/.test(label)) {
          eur = { buy: nums[0], sell: nums[1] };
        }
      });
  });

  return { usd, eur };
}
