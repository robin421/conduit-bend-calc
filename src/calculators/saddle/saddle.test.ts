import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  calculateFourPointSaddle,
  calculateThreePointSaddle,
} from './saddle.ts';
import { OFFSET_CONSTANTS } from '../../constants.ts';

test('calculateThreePointSaddle: 6" @30° → 弯曲点间距 12"、中心在 12"、跨度 24"', () => {
  const result = calculateThreePointSaddle(6, 30);
  assert.ok(result);
  assert.equal(result.markSpacingInches, 12);
  assert.equal(result.centerMarkPositionInches, 12);
  assert.equal(result.spanInches, 24);
  assert.equal(result.multiplier, 2.0);
  assert.deepEqual(
    result.marks.map((mark) => mark.fromCenterInches),
    [-12, 0, 12],
  );
  assert.deepEqual(
    result.marks.map((mark) => mark.id),
    [1, 2, 3],
  );
});

test('calculateThreePointSaddle: 各角度弯曲点间距与 PRD 第 10 节 multiplier 一致', () => {
  for (const angle of [10, 15, 22.5, 30, 45, 60] as const) {
    const result = calculateThreePointSaddle(1, angle);
    assert.ok(result);
    assert.equal(result.markSpacingInches, OFFSET_CONSTANTS[angle].multiplier);
    assert.equal(result.centerMarkPositionInches, OFFSET_CONSTANTS[angle].multiplier);
    assert.equal(result.spanInches, OFFSET_CONSTANTS[angle].multiplier * 2);
  }
});

test('calculateThreePointSaddle: 分数高度按比例计算', () => {
  const result = calculateThreePointSaddle(1.5, 60);
  assert.ok(result);
  assert.ok(Math.abs(result.markSpacingInches - 1.8) < 1e-9);
  const positions = result.marks.map((mark) => mark.fromCenterInches);
  assert.ok(Math.abs(positions[0] + 1.8) < 1e-9);
  assert.equal(positions[1], 0);
  assert.ok(Math.abs(positions[2] - 1.8) < 1e-9);
});

test('calculateThreePointSaddle: 非法高度返回 null', () => {
  assert.equal(calculateThreePointSaddle(0, 30), null);
  assert.equal(calculateThreePointSaddle(-6, 30), null);
  assert.equal(calculateThreePointSaddle(Number.NaN, 30), null);
  assert.equal(calculateThreePointSaddle(Number.POSITIVE_INFINITY, 30), null);
});

test('calculateThreePointSaddle: 非预设角度返回 null', () => {
  assert.equal(calculateThreePointSaddle(6, 20 as never), null);
});

test('calculateFourPointSaddle: 6" 高 @30°、宽 4" → 4 个标记点', () => {
  const result = calculateFourPointSaddle(6, 4, 30);
  assert.ok(result);
  assert.equal(result.markSpacingInches, 12);
  assert.equal(result.spanInches, 28);
  assert.equal(result.centerMarkPositionInches, 14);
  assert.deepEqual(
    result.marks.map((mark) => mark.fromCenterInches),
    [-14, -2, 2, 14],
  );
  assert.deepEqual(
    result.marks.map((mark) => mark.id),
    [1, 2, 3, 4],
  );
});

test('calculateFourPointSaddle: 各角度外侧间距与 PRD 第 10 节 multiplier 一致', () => {
  for (const angle of [10, 15, 22.5, 30, 45, 60] as const) {
    const result = calculateFourPointSaddle(2, 4, angle);
    assert.ok(result);
    assert.equal(result.markSpacingInches, 2 * OFFSET_CONSTANTS[angle].multiplier);
    assert.equal(result.spanInches, 4 * OFFSET_CONSTANTS[angle].multiplier + 4);
  }
});

test('calculateFourPointSaddle: 非法高度/宽度返回 null', () => {
  assert.equal(calculateFourPointSaddle(0, 4, 30), null);
  assert.equal(calculateFourPointSaddle(-6, 4, 30), null);
  assert.equal(calculateFourPointSaddle(Number.NaN, 4, 30), null);
  assert.equal(calculateFourPointSaddle(6, 0, 30), null);
  assert.equal(calculateFourPointSaddle(6, -4, 30), null);
  assert.equal(calculateFourPointSaddle(6, Number.NaN, 30), null);
  assert.equal(calculateFourPointSaddle(6, Number.POSITIVE_INFINITY, 30), null);
});

test('calculateFourPointSaddle: 非预设角度返回 null', () => {
  assert.equal(calculateFourPointSaddle(6, 4, 20 as never), null);
});

test('T15 回归：不同 R 下三点/四点显示值与 v1.0.0 一致（允差 ±1/16"）', () => {
  const radii = [4.3125, 4.625, 5.25, 5.5, 2.625];
  for (const angle of [10, 30, 60] as const) {
    for (const height of [2, 6]) {
      const legacy3 = calculateThreePointSaddle(height, angle);
      assert.ok(legacy3);
      const legacy4 = calculateFourPointSaddle(height, 4, angle);
      assert.ok(legacy4);
      for (const r of radii) {
        const next3 = calculateThreePointSaddle(height, angle, r);
        assert.ok(next3);
        assert.ok(
          Math.abs(next3.markSpacingInches - legacy3.markSpacingInches) <= 1 / 16,
        );
        assert.ok(
          Math.abs(next3.spanInches - legacy3.spanInches) <= 1 / 16,
        );
        assert.ok(next3.legGeometry);
        const next4 = calculateFourPointSaddle(height, 4, angle, r);
        assert.ok(next4);
        assert.ok(
          Math.abs(next4.markSpacingInches - legacy4.markSpacingInches) <= 1 / 16,
        );
        assert.ok(
          Math.abs(next4.spanInches - legacy4.spanInches) <= 1 / 16,
        );
        assert.ok(next4.legGeometry);
      }
    }
  }
});
