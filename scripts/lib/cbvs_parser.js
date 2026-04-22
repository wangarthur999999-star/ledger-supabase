// scripts/lib/cbvs_parser.js
//
// 从苏里南中央银行 (CBVS) "Daily Publications" 页面抽取当日平均汇率。
// 数据源: https://www.cbvs.sr/en/statistics/financial-market-statistics/daily-publications
//
// 页面结构 (截至 2026-03):
//   页面底部有一个 "Average Exchange Rates of the Surinamese Currency Market (Banknotes and Drafts)" 
//   的表格，包含 "Bought" 和 "Sold" 两列。 货币行形如:
//     U.S. DOLLAR (per USD)    37.252    37.627
//     EUR (per EUR)            42.624    43,350
//
// 注意事项:
//   - 价格通常以点 "." 做小数分隔符，但 CBVS 偶尔会输入错误地用逗号 "," (见上面的 EUR Sold)。
//     两种都要能解析。
//   - 数字范围目前在 ~30 到 ~50 SRD。超出 [1, 100000] 视为解析异常 (留足贬值余地)。

import * as cheerio from 'cheerio';

export const CBVS_DAILY_URL =
  'https://www.cbvs.sr/en/statistics/financial-market-statistics/daily-publications';

/**
 * 将 "37.252" 或 "43,350" 归一化为 number。
 * 如果字符串里同时有 "," 和 "."，按欧洲千位分隔逻辑处理 (点是千位，逗号是小数)。
 * 单独一个分隔符则统一当作小数点。
 * 合理范围 [1, 1000]，越界返回 null。
 */
export function parseRate(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // 抽取第一个像数字的片段（含分隔符）。要求至少一位数字，
  // 之后可跟任意数量的 [.,] 数字分组，这样能匹配 "1,234.56" / "1.234,56" / "37.252" / "43,350"。
  const m = s.match(/-?\d+(?:[.,]\d+)*/);
  if (!m) return null;
  let token = m[0];

  const hasComma = token.includes(',');
  const hasDot = token.includes('.');
  let normalized;
  if (hasComma && hasDot) {
    // e.g. "1,234.56" (en) 或 "1.234,56" (eu) — 用最后一个分隔符作为小数点
    const lastComma = token.lastIndexOf(',');
    const lastDot = token.lastIndexOf('.');
    if (lastComma > lastDot) {
      normalized = token.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = token.replace(/,/g, '');
    }
  } else if (hasComma) {
    // 只有逗号 — 当小数分隔符处理 (CBVS 的主风格以及常见欧洲写法)
    normalized = token.replace(',', '.');
  } else {
    normalized = token;
  }

  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 100000) return null;
  return n;
}

/**
 * 尝试在包含 label (比如 "USD" 或 "EUR") 的一行中找到紧随其后的两个数字。
 * 返回 { buy, sell } 或 null。
 */
function findPairInText(text, label) {
  // 不区分大小写查找 label，然后找后续的两个数字 token
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

/**
 * 从 CBVS "Daily Publications" 页面的 HTML 中抽取 USD 和 EUR 的买卖价。
 *
 * 策略:
 *  1) 优先找 "Average Exchange Rates" 表格的行 (最权威数据)。
 *  2) 如果 (1) 没拿到，回退到在整页里对 "U.S. DOLLAR"/"USD"、"EUR" 后面找两个数字。
 *
 * 返回值:
 *   { usd: {buy, sell}, eur: {buy, sell} }
 * 其中一个失败就返回 null 占位（由调用方决定如何处理）。
 */
export function parseCbvsDaily(html) {
  const $ = cheerio.load(html);

  // ---------- 策略 1: 找包含 "Bought"/"Sold" 表头的表格 ----------
  let usd = null;
  let eur = null;

  $('table').each((_, table) => {
    const tableText = $(table).text();
    if (!/Bought/i.test(tableText) || !/Sold/i.test(tableText)) return;

    $(table)
      .find('tr')
      .each((_, tr) => {
        const cells = $(tr)
          .find('td, th')
          .map((_, el) => $(el).text().trim())
          .get();
        if (cells.length < 3) return;

        const label = cells[0];
        // 在剩余的单元格里找前两个可解析的数字
        const nums = [];
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

  // ---------- 策略 2: 整页文本回退 ----------
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
