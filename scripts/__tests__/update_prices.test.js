// scripts/__tests__/update_prices.test.js
// 针对 update_prices.js 的单元测试(使用 Node.js 内置 test runner)
// 只测试不需要 mock 外部依赖的纯函数。

import { describe, it } from 'node:test';
import assert from 'node:assert';

// 测试时设置 DRY_RUN=1,让 requireEnv 不强制校验
process.env.DRY_RUN = '1';

const { round2, round4, FRED_CONFIG, METALS_DEV_CONFIG, requireEnv } = await import('../update_prices.js');

// ─── round2 ──────────────────────────
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

// ─── round4 ──────────────────────────
describe('round4', () => {
  it('rounds to 4 decimal places', () => {
    assert.strictEqual(round4(3.14159), 3.1416);
    assert.strictEqual(round4(0.000453592), 0.0005);
    assert.strictEqual(round4(0), 0);
  });

  it('handles negative numbers', () => {
    assert.strictEqual(round4(-1.23456), -1.2346);
  });

  it('preserves precision for sub-dollar prices (Rice/Wheat case)', () => {
    // round2 会丢精度变 0.29,round4 保留 0.2948
    assert.strictEqual(round4(0.29483), 0.2948);
  });
});

// ─── FRED_CONFIG ──────────────────────
describe('FRED_CONFIG', () => {
  const expectedDaily = ['WTI', 'BRENT', 'NATGAS'];
  const expectedMonthly = ['ALUMINUM', 'RICE', 'SUGAR', 'WHEAT', 'COFFEE', 'SOYBEAN_OIL'];

  it('has all 9 FRED commodities', () => {
    for (const symbol of [...expectedDaily, ...expectedMonthly]) {
      assert.ok(FRED_CONFIG[symbol], `${symbol} missing`);
    }
  });

  it('does NOT contain removed COPPER', () => {
    assert.strictEqual(FRED_CONFIG.COPPER, undefined, 'COPPER should be removed in B4');
  });

  it('each entry has required fields', () => {
    for (const [symbol, cfg] of Object.entries(FRED_CONFIG)) {
      assert.ok(cfg.seriesId, `${symbol} missing seriesId`);
      assert.ok(cfg.name, `${symbol} missing name`);
      assert.ok(cfg.unit, `${symbol} missing unit`);
      assert.ok(typeof cfg.unitFactor === 'number', `${symbol} unitFactor not number`);
      assert.ok(cfg.unitFactor > 0, `${symbol} unitFactor must be positive`);
      assert.ok(['daily', 'monthly'].includes(cfg.frequency), `${symbol} frequency must be daily or monthly`);
    }
  });

  it('daily commodities are correctly tagged', () => {
    for (const symbol of expectedDaily) {
      assert.strictEqual(FRED_CONFIG[symbol].frequency, 'daily', `${symbol} should be daily`);
    }
  });

  it('monthly commodities are correctly tagged', () => {
    for (const symbol of expectedMonthly) {
      assert.strictEqual(FRED_CONFIG[symbol].frequency, 'monthly', `${symbol} should be monthly`);
    }
  });

  it('ALUMINUM/RICE/WHEAT/SOYBEAN_OIL unitFactor converts MT to lb (~1/2204.62)', () => {
    for (const symbol of ['ALUMINUM', 'RICE', 'WHEAT', 'SOYBEAN_OIL']) {
      assert.ok(FRED_CONFIG[symbol].unitFactor < 0.001, `${symbol} factor too large`);
      assert.ok(FRED_CONFIG[symbol].unitFactor > 0.0004, `${symbol} factor too small`);
    }
  });

  it('SUGAR unitFactor converts cents/lb to USD/lb (0.01)', () => {
    assert.strictEqual(FRED_CONFIG.SUGAR.unitFactor, 0.01);
  });

  it('COFFEE unitFactor converts cents/lb to USD/lb (0.01)', () => {
    assert.strictEqual(FRED_CONFIG.COFFEE.unitFactor, 0.01);
  });
});

// ─── METALS_DEV_CONFIG ────────────────
describe('METALS_DEV_CONFIG', () => {
  it('has GOLD and SILVER entries', () => {
    assert.ok(METALS_DEV_CONFIG.GOLD, 'GOLD missing');
    assert.ok(METALS_DEV_CONFIG.SILVER, 'SILVER missing');
  });

  it('each entry has metal/name/unit', () => {
    for (const [symbol, cfg] of Object.entries(METALS_DEV_CONFIG)) {
      assert.ok(cfg.metal, `${symbol} missing metal`);
      assert.ok(cfg.name, `${symbol} missing name`);
      assert.strictEqual(cfg.unit, 'USD/oz', `${symbol} unit should be USD/oz`);
    }
  });

  it('metal field is lowercase string for API', () => {
    assert.strictEqual(METALS_DEV_CONFIG.GOLD.metal, 'gold');
    assert.strictEqual(METALS_DEV_CONFIG.SILVER.metal, 'silver');
  });
});

// ─── requireEnv ───────────────────────
describe('requireEnv', () => {
  it('does not throw in DRY_RUN mode even without env vars', () => {
    // DRY_RUN 已经在文件顶部设置为 '1'
    assert.doesNotThrow(() => requireEnv());
  });
});
