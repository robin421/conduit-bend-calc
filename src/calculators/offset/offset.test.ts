import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculateOffset } from './offset.ts';

test('calculateOffset: PRD AC1 6" @30° → 间距 12"、shrink 1.5"', () => {
  const result = calculateOffset(6, 30);
  assert.ok(result);
  assert.equal(result.distanceBetweenBends, 12);
  assert.equal(result.shrink, 1.5);
  assert.equal(result.multiplier, 2.0);
});

test('calculateOffset: 其它预设角度常数与 PRD 第 10 节一致', () => {
  assert.equal(calculateOffset(1, 10)?.distanceBetweenBends, 6);
  assert.equal(calculateOffset(1, 10)?.shrink, 1 / 16);
  assert.equal(calculateOffset(1, 15)?.distanceBetweenBends, 3.9);
  assert.equal(calculateOffset(1, 15)?.shrink, 1 / 8);
  assert.equal(calculateOffset(1, 22.5)?.distanceBetweenBends, 2.6);
  assert.equal(calculateOffset(1, 22.5)?.shrink, 3 / 16);
  assert.equal(calculateOffset(1, 45)?.distanceBetweenBends, 1.4);
  assert.equal(calculateOffset(1, 45)?.shrink, 3 / 8);
  assert.equal(calculateOffset(1, 60)?.distanceBetweenBends, 1.2);
  assert.equal(calculateOffset(1, 60)?.shrink, 1 / 2);
});

test('calculateOffset: 非法高度返回 null', () => {
  assert.equal(calculateOffset(0, 30), null);
  assert.equal(calculateOffset(-6, 30), null);
  assert.equal(calculateOffset(Number.NaN, 30), null);
  assert.equal(calculateOffset(Number.POSITIVE_INFINITY, 30), null);
});

test('calculateOffset: 非预设角度返回 null', () => {
  assert.equal(calculateOffset(6, 20 as never), null);
});
