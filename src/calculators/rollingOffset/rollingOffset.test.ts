import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculateRollingOffset } from './rollingOffset.ts';

test('calculateRollingOffset: rise=6、roll=8、θ=30° → 真实偏移 10、间距 20', () => {
  const result = calculateRollingOffset(6, 8, 30, 4.625);
  assert.ok(result);
  assert.equal(result.trueOffset, 10);
  assert.equal(result.spacingDisplay, 20);
  assert.equal(result.shrinkDisplay, 2.5);
  assert.ok(Math.abs(result.rollAngleDeg - 53.13) < 0.01);
  assert.equal(result.marks.length, 2);
  assert.equal(result.marks[0]?.fromStartInches, 0);
  assert.equal(result.marks[1]?.fromStartInches, 20);
  assert.ok(result.geometry);
});

test('calculateRollingOffset: 非法输入返回 null', () => {
  assert.equal(calculateRollingOffset(0, 8, 30, 4.625), null);
  assert.equal(calculateRollingOffset(6, -8, 30, 4.625), null);
  assert.equal(calculateRollingOffset(6, 8, 20 as never, 4.625), null);
  assert.equal(calculateRollingOffset(6, 8, 30, 0), null);
});
