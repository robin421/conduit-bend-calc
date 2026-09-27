import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculateOffset } from './offset.ts';
import { OFFSET_ANGLES } from '../../constants.ts';

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

test('T15 回归：不同 R 下显示值与 v1.0.0 一致（允差 ±1/16"）', () => {
  const radii = [4.3125, 4.625, 5.25, 5.5, 2.625];
  for (const angle of OFFSET_ANGLES) {
    for (const height of [1, 6, 12.5]) {
      const legacy = calculateOffset(height, angle);
      assert.ok(legacy);
      for (const r of radii) {
        const next = calculateOffset(height, angle, r);
        assert.ok(next);
        assert.ok(
          Math.abs(next.distanceBetweenBends - legacy.distanceBetweenBends) <= 1 / 16,
          `angle=${angle} h=${height} r=${r}`,
        );
        assert.ok(
          Math.abs(next.shrink - legacy.shrink) <= 1 / 16,
          `angle=${angle} h=${height} r=${r}`,
        );
        assert.ok(next.geometry, '引擎几何详情应随结果返回');
      }
    }
  }
});
