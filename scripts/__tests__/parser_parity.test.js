// scripts/__tests__/parser_parity.test.js
//
// 保证 Node 版 (scripts/lib/cbvs_parser.js) 和 Deno 版
// (supabase/functions/update-rates/cbvs_parser.ts) 的解析逻辑等价。
//
// 做法: 用 TypeScript 官方 transpileModule 把 TS 版剥成 JS,
// 再把 esm.sh 的 cheerio 导入改成本地 'cheerio', 然后动态 import,
// 对同一输入比较输出。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(
  resolve(__dirname, 'fixtures/cbvs_daily_2026-03-30.html'),
  'utf-8'
);

async function loadDenoParser() {
  const tsPath = resolve(
    __dirname,
    '..',
    '..',
    'supabase',
    'functions',
    'update-rates',
    'cbvs_parser.ts'
  );
  let tsSrc = readFileSync(tsPath, 'utf-8');
  // 把 esm.sh 的 cheerio 远程 import 换成本地 bare specifier
  tsSrc = tsSrc.replace(
    /from\s+['"]https:\/\/esm\.sh\/cheerio[^'"]*['"]/g,
    `from 'cheerio'`
  );

  const out = ts.transpileModule(tsSrc, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  // 写到项目内的一个临时 .mjs, 这样 'cheerio' 的 resolve 能找到 node_modules
  const outDir = mkdtempSync(join(__dirname, '.parity-'));
  const outPath = join(outDir, 'cbvs_parser.mjs');
  writeFileSync(outPath, out.outputText, 'utf-8');
  return await import(pathToFileURL(outPath).href);
}

test('Node 版与 Deno 版 parseRate 行为一致', async () => {
  const node = await import('../lib/cbvs_parser.js');
  const deno = await loadDenoParser();

  const cases = [
    '37.252',
    '43,350',
    '1,234.56',
    '1.234,56',
    '0.5',
    '999999',
    'abc',
    '',
    null,
    '  37.252  ',
    'USD 37.252',
  ];
  for (const c of cases) {
    const a = node.parseRate(c);
    const b = deno.parseRate(c);
    assert.equal(
      b,
      a,
      `parseRate(${JSON.stringify(c)}) 两实现不一致: node=${a} deno=${b}`
    );
  }
});

test('Node 版与 Deno 版 parseCbvsDaily 在真实样本上产生相同结果', async () => {
  const node = await import('../lib/cbvs_parser.js');
  const deno = await loadDenoParser();

  const nr = node.parseCbvsDaily(fixture);
  const dr = deno.parseCbvsDaily(fixture);
  assert.deepEqual(dr, nr, 'parseCbvsDaily 两实现应该输出相同对象');

  assert.equal(nr.usd.buy, 37.252);
  assert.equal(nr.usd.sell, 37.627);
  assert.equal(nr.eur.buy, 42.624);
  assert.equal(nr.eur.sell, 43.35);
});

// -------------------- Finabank parity --------------------

const finabankFixture = readFileSync(
  resolve(__dirname, 'fixtures/finabank_rates_2026-04-22.html'),
  'utf-8'
);

async function loadDenoFinabankParser() {
  const tsPath = resolve(
    __dirname,
    '..',
    '..',
    'supabase',
    'functions',
    'update-rates',
    'finabank_parser.ts'
  );
  let tsSrc = readFileSync(tsPath, 'utf-8');
  // cheerio: esm.sh -> 本地
  tsSrc = tsSrc.replace(
    /from\s+['"]https:\/\/esm\.sh\/cheerio[^'"]*['"]/g,
    `from 'cheerio'`
  );
  // 相对 import './cbvs_parser.ts' -> 指向 Node 版的 cbvs_parser.js
  // (因为 Node 版和 Deno 版 cbvs_parser 已由单独的 parity 测试保证等价)
  const nodeCbvsPath = pathToFileURL(
    resolve(__dirname, '..', 'lib', 'cbvs_parser.js')
  ).href;
  tsSrc = tsSrc.replace(
    /from\s+['"]\.\/cbvs_parser\.ts['"]/g,
    `from '${nodeCbvsPath}'`
  );

  const out = ts.transpileModule(tsSrc, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const outDir = mkdtempSync(join(__dirname, '.parity-'));
  const outPath = join(outDir, 'finabank_parser.mjs');
  writeFileSync(outPath, out.outputText, 'utf-8');
  return await import(pathToFileURL(outPath).href);
}

test('Node 版与 Deno 版 parseFinabankRates 在真实样本上产生相同结果', async () => {
  const node = await import('../lib/finabank_parser.js');
  const deno = await loadDenoFinabankParser();

  const nr = node.parseFinabankRates(finabankFixture);
  const dr = deno.parseFinabankRates(finabankFixture);
  assert.deepEqual(dr, nr, 'parseFinabankRates 两实现应该输出相同对象');

  // 同时断言具体数值防止两边同时错成相同错误值
  assert.equal(nr.usd.buy, 37.223);
  assert.equal(nr.usd.sell, 37.753);
  assert.equal(nr.eur.buy, 43.699);
  assert.equal(nr.eur.sell, 44.394);
});
