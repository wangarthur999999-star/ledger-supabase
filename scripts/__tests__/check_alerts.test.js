import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { evaluateThreshold } from '../check_alerts.js';

const baseRate = {
  pair: 'USD / SRD',
  official_buy: 38.0,
  official_sell: 38.5,
  street_buy: 39.0,
  street_sell: 39.5,
  change: 1.5,
};

function makeThreshold(overrides) {
  return {
    id: 't1',
    pair: 'USD / SRD',
    threshold_kind: 'above',
    threshold_value: 40,
    compare_field: 'street_buy',
    enabled: true,
    ...overrides,
  };
}

test('above: 未达阈值, 不触发', () => {
  const r = evaluateThreshold(makeThreshold({ threshold_value: 40 }), baseRate);
  assert.equal(r.triggered, false);
});

test('above: 达到阈值, 触发', () => {
  const r = evaluateThreshold(makeThreshold({ threshold_value: 38 }), baseRate);
  assert.equal(r.triggered, true);
  assert.equal(r.observedValue, 39.0);
  assert.match(r.message, /USD \/ SRD/);
});

test('above: 恰好等于阈值边界, 触发 (>=)', () => {
  const r = evaluateThreshold(makeThreshold({ threshold_value: 39 }), baseRate);
  assert.equal(r.triggered, true);
});

test('below: 未达阈值, 不触发', () => {
  const r = evaluateThreshold(
    makeThreshold({ threshold_kind: 'below', threshold_value: 38 }),
    baseRate,
  );
  assert.equal(r.triggered, false);
});

test('below: 达到阈值, 触发', () => {
  const r = evaluateThreshold(
    makeThreshold({ threshold_kind: 'below', threshold_value: 40 }),
    baseRate,
  );
  assert.equal(r.triggered, true);
});

test('compare_field 切换', () => {
  // 同 pair, 比较 official_sell (38.5) vs threshold 38
  const r = evaluateThreshold(
    makeThreshold({ compare_field: 'official_sell', threshold_value: 38 }),
    baseRate,
  );
  assert.equal(r.triggered, true);
  assert.equal(r.observedValue, 38.5);
});

test('change: 当日涨跌 < 阈值, 不触发', () => {
  const r = evaluateThreshold(
    makeThreshold({ threshold_kind: 'change', threshold_value: 2 }),
    baseRate, // change = 1.5
  );
  assert.equal(r.triggered, false);
});

test('change: 当日涨跌 >= 阈值, 触发', () => {
  const r = evaluateThreshold(
    makeThreshold({ threshold_kind: 'change', threshold_value: 1 }),
    baseRate,
  );
  assert.equal(r.triggered, true);
});

test('change: 负方向涨跌取绝对值', () => {
  const r = evaluateThreshold(
    makeThreshold({ threshold_kind: 'change', threshold_value: 2 }),
    { ...baseRate, change: -3.2 },
  );
  assert.equal(r.triggered, true);
  assert.ok(Math.abs(r.observedValue - 3.2) < 0.001);
});

test('change: change 字段缺失时按 0 处理, 不触发', () => {
  const r = evaluateThreshold(
    makeThreshold({ threshold_kind: 'change', threshold_value: 0.1 }),
    { ...baseRate, change: null },
  );
  assert.equal(r.triggered, false);
});

test('未知 kind 不触发', () => {
  const r = evaluateThreshold(
    makeThreshold({ threshold_kind: 'unknown' }),
    baseRate,
  );
  assert.equal(r.triggered, false);
});

test('compare_field 在 rate 上是非数字, 不触发也不抛', () => {
  const r = evaluateThreshold(
    makeThreshold({ compare_field: 'street_buy', threshold_value: 1 }),
    { ...baseRate, street_buy: null },
  );
  assert.equal(r.triggered, false);
});
