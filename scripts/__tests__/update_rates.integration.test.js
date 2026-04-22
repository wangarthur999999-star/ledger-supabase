// scripts/__tests__/update_rates.integration.test.js
//
// 端到端集成测试:
//   起一个本地 HTTP 服务, 返回真实 CBVS 样本 HTML。
//   以 DRY_RUN=1 模式运行 update_rates.js, 指向这个本地地址。
//   断言进程退出码为 0 且 stdout 里包含正确解析结果。
//
//   因此这个测试不需要任何外网访问 (沙箱友好), 也不需要真的 Supabase。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureHtml = readFileSync(
  resolve(__dirname, 'fixtures/cbvs_daily_2026-03-30.html'),
  'utf-8'
);
const scriptPath = resolve(__dirname, '..', 'update_rates.js');

function startFixtureServer() {
  return new Promise((resolvePromise) => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fixtureHtml);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolvePromise({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

function runScript(cbvsUrl) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        CBVS_URL: cbvsUrl,
        DRY_RUN: '1',
        // 刻意不提供 SUPABASE_*，DRY_RUN=1 时应跳过校验
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

test('update_rates.js 在 DRY_RUN 下成功解析样本 HTML', async () => {
  const { server, url } = await startFixtureServer();
  try {
    const { code, stdout, stderr } = await runScript(url);

    assert.equal(code, 0, `进程应以 0 退出，得到 ${code}。\nstderr: ${stderr}`);
    assert.ok(
      stdout.includes('DRY_RUN=1'),
      '应提示 DRY_RUN 路径。stdout:\n' + stdout
    );
    // 解析出来的数字应该出现在打印的表格里
    assert.ok(stdout.includes('37.252'), 'USD buy 37.252 应出现');
    assert.ok(stdout.includes('37.627'), 'USD sell 37.627 应出现');
    assert.ok(stdout.includes('42.624'), 'EUR buy 42.624 应出现');
    assert.ok(stdout.includes('43.35'), 'EUR sell 43.35 (从 "43,350" 恢复) 应出现');
    // 街头价 = 官方 * 1.025
    assert.ok(
      stdout.includes('38.183'),
      'USD street_buy = 37.252 * 1.025 = 38.183 应出现'
    );
  } finally {
    server.close();
  }
});

test('update_rates.js 在 HTML 无数据时以非 0 退出码失败', async () => {
  const emptyServer = await new Promise((resolvePromise) => {
    const s = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body>no rates today</body></html>');
    });
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      resolvePromise({ s, url: `http://127.0.0.1:${port}/` });
    });
  });

  try {
    const { code, stderr } = await runScript(emptyServer.url);
    assert.notEqual(code, 0, '空页面应触发失败');
    assert.ok(
      /解析失败|未找到/.test(stderr),
      '应在 stderr 提示解析失败。stderr:\n' + stderr
    );
  } finally {
    emptyServer.s.close();
  }
});
