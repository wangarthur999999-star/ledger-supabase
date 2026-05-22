// formatRelativeTime 是纯函数, 用 node:test 跑 (不引 vitest, 避免大依赖)。
// 命令: node --import tsx --test src/lib/__tests__/formatTime.test.ts
// 或在 package.json 加 "test:src": ...

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { formatRelativeTime } from '../formatTime';

// 假 t 函数: 返回 "key|n=N" 让我们能在断言里看到选了哪个 key 和 n 参数。
// 用 any-cast 通过 formatRelativeTime 的 TimeT 签名校验, 测试里足够。
const fakeT = ((key: string, vars?: Record<string, string | number>) => {
  if (vars && 'n' in vars) return `${key}|n=${vars.n}`;
  return key;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

const NOW = new Date('2026-05-20T12:00:00Z');

test('undefined timestamp -> unknown + stale', () => {
  const r = formatRelativeTime(undefined, fakeT, NOW);
  assert.equal(r.text, 'common.unknown');
  assert.equal(r.isStale, true);
});

test('garbage timestamp -> unknown + stale', () => {
  const r = formatRelativeTime('not-a-date', fakeT, NOW);
  assert.equal(r.text, 'common.unknown');
  assert.equal(r.isStale, true);
});

test('future timestamp -> just now (not stale)', () => {
  const r = formatRelativeTime('2026-05-20T12:01:00Z', fakeT, NOW);
  assert.equal(r.text, 'time.justNow');
  assert.equal(r.isStale, false);
});

test('< 1 minute ago -> just now', () => {
  const r = formatRelativeTime('2026-05-20T11:59:30Z', fakeT, NOW);
  assert.equal(r.text, 'time.justNow');
});

test('1 minute ago -> singular', () => {
  const r = formatRelativeTime('2026-05-20T11:59:00Z', fakeT, NOW);
  assert.equal(r.text, 'time.minuteAgo|n=1');
});

test('5 minutes ago -> plural', () => {
  const r = formatRelativeTime('2026-05-20T11:55:00Z', fakeT, NOW);
  assert.equal(r.text, 'time.minutesAgo|n=5');
});

test('1 hour ago -> singular', () => {
  const r = formatRelativeTime('2026-05-20T11:00:00Z', fakeT, NOW);
  assert.equal(r.text, 'time.hourAgo|n=1');
});

test('5 hours ago -> plural', () => {
  const r = formatRelativeTime('2026-05-20T07:00:00Z', fakeT, NOW);
  assert.equal(r.text, 'time.hoursAgo|n=5');
});

test('1 day ago -> singular, not yet stale (< 48h)', () => {
  const r = formatRelativeTime('2026-05-19T12:00:00Z', fakeT, NOW);
  assert.equal(r.text, 'time.dayAgo|n=1');
  assert.equal(r.isStale, false);
});

test('3 days ago -> plural + stale (> 48h)', () => {
  const r = formatRelativeTime('2026-05-17T12:00:00Z', fakeT, NOW);
  assert.equal(r.text, 'time.daysAgo|n=3');
  assert.equal(r.isStale, true);
});

test('exactly at stale threshold (48h) -> not stale yet', () => {
  // STALE_THRESHOLD = 48 * HOUR. diff = 48h 应该 不 > 48h -> isStale false
  const r = formatRelativeTime('2026-05-18T12:00:00Z', fakeT, NOW);
  assert.equal(r.isStale, false);
});
