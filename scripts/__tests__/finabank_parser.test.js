// scripts/__tests__/finabank_parser.test.js
//
// 用真实 Finabank HTML 样本验证解析器。
//   node --test scripts/__tests__/finabank_parser.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { parseFinabankRates } from '../lib/finabank_parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const realHtml = readFileSync(
  resolve(__dirname, 'fixtures/finabank_rates_2026-04-22.html'),
  'utf-8'
);

test('parseFinabankRates: 从真实 HTML 样本中抽取 USD/EUR', () => {
  const { usd, eur } = parseFinabankRates(realHtml);

  assert.ok(usd, 'USD 必须被解析到');
  assert.ok(eur, 'EUR 必须被解析到');

  // 2026-04-22 当天的真实数据
  assert.equal(usd.buy, 37.223, `USD buy 应为 37.223，得到 ${usd.buy}`);
  assert.equal(usd.sell, 37.753, `USD sell 应为 37.753，得到 ${usd.sell}`);
  assert.equal(eur.buy, 43.699, `EUR buy 应为 43.699，得到 ${eur.buy}`);
  assert.equal(eur.sell, 44.394, `EUR sell 应为 44.394，得到 ${eur.sell}`);
});

test('parseFinabankRates: Tussenkoers 表格不会被误匹配', () => {
  // 页面第二个表格是 "Tussenkoers" (欧元美元互换中间价), 有 1.1525 / 1.1925 这种数字.
  // parser 不应该把它们当成 USD/EUR 的主报价。
  // 真实 fixture 里两个表都有, 所以上面的测试已经隐含验证了这一点
  // (如果混淆了, usd.buy 会变成 1.1525 而不是 37.223)。
  const { usd, eur } = parseFinabankRates(realHtml);
  assert.ok(usd.buy > 30, 'USD buy 应远大于 tussenkoers 数值 (~1.15)');
  assert.ok(eur.buy > 30, 'EUR buy 应远大于 tussenkoers 数值 (~1.15)');
});

test('parseFinabankRates: 空/无关 HTML 返回 null', () => {
  const { usd, eur } = parseFinabankRates(
    '<html><body>No table here</body></html>'
  );
  assert.equal(usd, null);
  assert.equal(eur, null);
});

test('parseFinabankRates: 容忍不同货币 label 写法', () => {
  const alt = `
    <html><body>
    <table>
      <tr><th></th><th>Aankoop</th><th>Verkoop</th></tr>
      <tr><td>USD</td><td>38.000</td><td>38.500</td></tr>
      <tr><td>EURO</td><td>44.000</td><td>44.500</td></tr>
    </table>
    </body></html>
  `;
  const { usd, eur } = parseFinabankRates(alt);
  assert.ok(usd);
  assert.ok(eur);
  assert.equal(usd.buy, 38.0);
  assert.equal(eur.buy, 44.0);
});
