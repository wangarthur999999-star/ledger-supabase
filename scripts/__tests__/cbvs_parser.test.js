// scripts/__tests__/cbvs_parser.test.js
//
// 用 Node 自带的 test runner 跑 (node v22 原生支持):
//   node --test scripts/__tests__/cbvs_parser.test.js
//
// 这些测试只用离线 HTML 样本，不走网络——所以可以在任何沙箱里跑。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { parseRate, parseCbvsDaily } from '../lib/cbvs_parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, 'fixtures/cbvs_daily_2026-03-30.html');
const realHtml = readFileSync(fixturePath, 'utf-8');

test('parseRate: 简单点分小数', () => {
  assert.equal(parseRate('37.252'), 37.252);
  assert.equal(parseRate('42.624'), 42.624);
});

test('parseRate: 逗号作小数 (CBVS 偶尔会这样)', () => {
  assert.equal(parseRate('43,350'), 43.35);
  assert.equal(parseRate('37,627'), 37.627);
});

test('parseRate: 混合千位 + 小数', () => {
  assert.equal(parseRate('1,234.56'), 1234.56); // 英式
  assert.equal(parseRate('1.234,56'), 1234.56); // 欧式
});

test('parseRate: 拒绝不合理范围', () => {
  assert.equal(parseRate('0.5'), null);
  assert.equal(parseRate('999999'), null);
  assert.equal(parseRate('abc'), null);
  assert.equal(parseRate(''), null);
  assert.equal(parseRate(null), null);
});

test('parseRate: 从杂乱文本中抽取数字', () => {
  assert.equal(parseRate('  37.252  '), 37.252);
  assert.equal(parseRate('USD 37.252'), 37.252);
});

test('parseCbvsDaily: 解析真实 CBVS HTML 样本', () => {
  const { usd, eur } = parseCbvsDaily(realHtml);

  assert.ok(usd, 'USD 必须被解析到');
  assert.ok(eur, 'EUR 必须被解析到');

  // 这些是 2026-03-30 的真实数据
  assert.equal(usd.buy, 37.252, `USD buy: 期望 37.252，得到 ${usd.buy}`);
  assert.equal(usd.sell, 37.627, `USD sell: 期望 37.627，得到 ${usd.sell}`);
  assert.equal(eur.buy, 42.624, `EUR buy: 期望 42.624，得到 ${eur.buy}`);
  // EUR sell 在源 HTML 里写的是 "43,350" (逗号错写)，必须归一化到 43.35
  assert.equal(eur.sell, 43.35, `EUR sell: 期望 43.35 (从 "43,350" 恢复)，得到 ${eur.sell}`);
});

test('parseCbvsDaily: 空/无关 HTML 返回空对象而不报错', () => {
  const { usd, eur } = parseCbvsDaily('<html><body>No data here</body></html>');
  assert.equal(usd, null);
  assert.equal(eur, null);
});

test('parseCbvsDaily: 回退文本搜索能处理无 <table> 标记的纯文本', () => {
  const plain = `
    <html><body>
    <div>Average Exchange Rates</div>
    U.S. DOLLAR (per USD)   38.100   38.500
    EUR (per EUR)           44.200   44.800
    </body></html>
  `;
  const { usd, eur } = parseCbvsDaily(plain);
  assert.ok(usd);
  assert.ok(eur);
  assert.equal(usd.buy, 38.1);
  assert.equal(usd.sell, 38.5);
  assert.equal(eur.buy, 44.2);
  assert.equal(eur.sell, 44.8);
});
