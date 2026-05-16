// scripts/__tests__/update_rates.integration.test.js
//
// 端到端集成测试:
//   起两个本地 HTTP 服务分别返回 CBVS 和 Finabank 样本 HTML，
//   以 DRY_RUN=1 模式运行 update_rates.js 指向它们，
//   断言进程退出码 + stdout/stderr 内容。
//
// 不需要外网, 不需要真的 Supabase。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cbvsHtml = readFileSync(
  resolve(__dirname, 'fixtures/cbvs_daily_2026-03-30.html'),
  'utf-8'
);
const finabankHtml = readFileSync(
  resolve(__dirname, 'fixtures/finabank_rates_2026-04-22.html'),
  'utf-8'
);
const scriptPath = resolve(__dirname, '..', 'update_rates.js');

function startServer(responder) {
  return new Promise((resolvePromise) => {
    const server = createServer(responder);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolvePromise({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

function htmlServer(html, status = 200) {
  return startServer((_req, res) => {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
}

function runScript({ cbvsUrl, finabankUrl }) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        CBVS_URL: cbvsUrl,
        FINABANK_URL: finabankUrl,
        DRY_RUN: '1',
        SUPABASE_URL: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
      },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (b) => (stdout += b.toString()));
    child.stderr.on('data', (b) => (stderr += b.toString()));
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
  });
}

test('双源都成功: 街头价用 Finabank 数据', async () => {
  const cbvs = await htmlServer(cbvsHtml);
  const fina = await htmlServer(finabankHtml);
  try {
    const { code, stdout, stderr } = await runScript({
      cbvsUrl: cbvs.url,
      finabankUrl: fina.url,
    });
    assert.equal(code, 0, `进程应以 0 退出。stderr:\n${stderr}`);

    // CBVS 官方价（来自 cbvs 样本）
    assert.ok(stdout.includes('37.252'), 'USD official_buy 37.252');
    assert.ok(stdout.includes('37.627'), 'USD official_sell 37.627');

    // Finabank 街头价（来自 finabank 样本 2026-04-22）
    assert.ok(stdout.includes('37.223'), 'USD street_buy 37.223 (Finabank)');
    assert.ok(stdout.includes('37.753'), 'USD street_sell 37.753 (Finabank)');
    assert.ok(stdout.includes('43.699'), 'EUR street_buy 43.699 (Finabank)');
    assert.ok(stdout.includes('44.394'), 'EUR street_sell 44.394 (Finabank)');

    // 应标明数据来源
    assert.ok(stdout.includes('finabank'), 'street_source 应标为 finabank');
    assert.ok(stdout.includes('DRY_RUN=1'), '应走 DRY_RUN 路径');
  } finally {
    cbvs.server.close();
    fina.server.close();
  }
});

test('Finabank 挂掉: CBVS 正常 + 街头价回退到估算', async () => {
  const cbvs = await htmlServer(cbvsHtml);
  // 给 Finabank 一个 500, 让它抓取失败
  const fina = await startServer((_req, res) => {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<html>500</html>');
  });
  try {
    const { code, stdout, stderr } = await runScript({
      cbvsUrl: cbvs.url,
      finabankUrl: fina.url,
    });
    assert.equal(code, 0, `进程应仍然以 0 退出 (Finabank 失败不阻断)。stderr:\n${stderr}`);

    // CBVS 官方数据仍在
    assert.ok(stdout.includes('37.252'), 'CBVS USD official 仍被解析');
    // 街头价回退到估算 (37.252 * 1.025 = 38.183)
    assert.ok(stdout.includes('38.183'), 'USD street_buy 应回退到估算 38.183');
    assert.ok(stdout.includes('estimated'), 'street_source 应标为 estimated');
    // 警告信息应被打印
    assert.ok(
      /Finabank/.test(stderr + stdout),
      '应在日志提到 Finabank 失败'
    );
  } finally {
    cbvs.server.close();
    fina.server.close();
  }
});

test('Finabank 返回无汇率内容: CBVS 正常 + 街头价回退', async () => {
  const cbvs = await htmlServer(cbvsHtml);
  const fina = await htmlServer('<html><body>nothing here</body></html>');
  try {
    const { code, stdout } = await runScript({
      cbvsUrl: cbvs.url,
      finabankUrl: fina.url,
    });
    assert.equal(code, 0, '空 Finabank 页面不应阻断');
    assert.ok(stdout.includes('38.183'), 'street_buy 应回退到估算');
    assert.ok(stdout.includes('estimated'), 'street_source 应为 estimated');
  } finally {
    cbvs.server.close();
    fina.server.close();
  }
});

test('CBVS 无数据: 整个脚本失败 (官方价是硬要求)', async () => {
  const cbvs = await htmlServer('<html><body>no rates today</body></html>');
  const fina = await htmlServer(finabankHtml);
  try {
    const { code, stderr } = await runScript({
      cbvsUrl: cbvs.url,
      finabankUrl: fina.url,
    });
    assert.notEqual(code, 0, 'CBVS 空页面应触发失败');
    assert.ok(
      /解析失败|未找到/.test(stderr),
      '应在 stderr 提示 CBVS 解析失败。stderr:\n' + stderr
    );
  } finally {
    cbvs.server.close();
    fina.server.close();
  }
});
