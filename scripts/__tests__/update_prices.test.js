// scripts/__tests__/update_prices.test.js
// 针对 update_prices.js 的单元测试（使用 Node.js 内置 test runner）
// 只测试不需要 mock 外部依赖的纯函数。

import { describe, it } from 'node:test';
import assert from 'node:assert';

// 测试时设置 DRY_RUN=1，让 requireEnv 不强制校验
process.env.DRY_RUN = '1';

const { round2, FRED_CONFIG, requireEnv } = await import('../update_prices.js');

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    assert.strictEqual(round2(3.14159), 3.14);
    assert.strictEqual(round2(78.567), 78.57);
    assert.strictEqual(round2(0), 0);
  });

  it('handles negative numbers', () => {
    assert.strictEqual(round2(-1.235), -1.24);
  });

  it('preserves already-rounded values', () => {
    assert.strictEqual(round2(5.00), 5);
    assert.strictEqual(round2(12.34), 12.34);
  });
});

describe('FRED_CONFIG', () => {
  it('has WTI, BRENT, COPPER entries', () => {
    assert.ok(FRED_CONFIG.WTI, 'WTI missing');
    assert.ok(FRED_CONFIG.BRENT, 'BRENT missing');
    assert.ok(FRED_CONFIG.COPPER, 'COPPER missing');
  });

  it('each entry has seriesId and unitFactor', () => {
    for (const [symbol, cfg] of Object.entries(FRED_CONFIG)) {
      assert.ok(cfg.seriesId, `${symbol} missing seriesId`);
      assert.ok(typeof cfg.unitFactor === 'number', `${symbol} unitFactor not number`);
      assert.ok(cfg.unitFactor > 0, `${symbol} unitFactor must be positive`);
    }
  });

  it('COPPER unitFactor converts MT to lb correctly', () => {
    // 2204.62 lb in 1 MT, so factor should be 1/2204.62 ≈ 0.000453592
    assert.ok(FRED_CONFIG.COPPER.unitFactor < 0.001);
    assert.ok(FRED_CONFIG.COPPER.unitFactor > 0.0004);
  });
});

describe('requireEnv', () => {
  it('does not throw in DRY_RUN mode even without env vars', () => {
    // DRY_RUN 已经在文件顶部设置为 '1'
    assert.doesNotThrow(() => requireEnv());
  });
});
