import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  calculateFourPointSaddle,
  calculateThreePointSaddle,
  saddle3ShrinkPerInch,
  saddle3SpacingMultiplier,
} from './saddle.ts';
import { OFFSET_CONSTANTS } from '../../constants.ts';

test('calculateThreePointSaddle: 6" @30°（中心）→ 两侧 15°，间距 23.4"、跨度 46.8"', () => {
  const result = calculateThreePointSaddle(6, 30);
  assert.ok(result);
  assert.equal(result.markSpacingInches, 23.4);
  assert.equal(result.centerMarkPositionInches, 23.4);
  assert.equal(result.spanInches, 46.8);
  assert.equal(result.multiplier, 3.9);
  assert.deepEqual(
    result.marks.map((mark) => mark.fromCenterInches),
    [-23.4, 0, 23.4],
  );
  assert.deepEqual(
    result.marks.map((mark) => mark.id),
    [1, 2, 3],
  );
});

test('T27: 3 点鞍弯间距用半角乘数（45° 中心→2.5H 为现场标准值）', () => {
  const expected: Record<number, number> = {
    10: 1 / Math.sin((5 * Math.PI) / 180),
    15: 1 / Math.sin((7.5 * Math.PI) / 180),
    22.5: 1 / Math.sin((11.25 * Math.PI) / 180),
    30: 3.9,
    45: 2.5,
    60: 2.0,
  };
  for (const angle of [10, 15, 22.5, 30, 45, 60] as const) {
    const result = calculateThreePointSaddle(1, angle);
    assert.ok(result);
    assert.ok(
      Math.abs(result.markSpacingInches - expected[angle]) < 1e-9,
      `angle ${angle}`,
    );
    assert.equal(result.multiplier, saddle3SpacingMultiplier(angle));
    assert.equal(result.spanInches, result.markSpacingInches * 2);
  }
});

test('T27: 6" @45°（中心）→ 间距 15"、跨度 30"、multiplier 2.5', () => {
  const result = calculateThreePointSaddle(6, 45);
  assert.ok(result);
  assert.equal(result.markSpacingInches, 15);
  assert.equal(result.centerMarkPositionInches, 15);
  assert.equal(result.spanInches, 30);
  assert.equal(result.multiplier, 2.5);
  assert.deepEqual(
    result.marks.map((mark) => mark.fromCenterInches),
    [-15, 0, 15],
  );
});

test('T28: 3 点鞍弯中心标记 shrink（45° → H×3/16"，30° → H×1/8"）', () => {
  const r45 = calculateThreePointSaddle(6, 45);
  assert.ok(r45);
  assert.ok(Math.abs((r45.shrinkInches ?? 0) - 1.125) < 1e-9);
  assert.equal(saddle3ShrinkPerInch(45), 3 / 16);
  const r30 = calculateThreePointSaddle(6, 30);
  assert.ok(r30);
  assert.ok(Math.abs((r30.shrinkInches ?? 0) - 0.75) < 1e-9);
  assert.equal(saddle3ShrinkPerInch(30), 1 / 8);
});

test('T29: 3 点鞍弯标记指令带基准刻度提示（中心 rim notch、两侧 arrow）', () => {
  const result = calculateThreePointSaddle(6, 45);
  assert.ok(result);
  assert.ok(result.marks[1].instruction.includes('rim notch'));
  assert.ok(result.marks[0].instruction.includes('arrow'));
  assert.ok(result.marks[2].instruction.includes('arrow'));
});

test('T29/T30: 4 点鞍弯外侧标记带 arrow 提示，总 shrink = 2×offset shrink', () => {
  const result = calculateFourPointSaddle(6, 4, 30);
  assert.ok(result);
  assert.ok(result.marks[0].instruction.includes('arrow'));
  assert.ok(result.marks[3].instruction.includes('arrow'));
  assert.equal(result.totalShrinkInches, 3);
});

test('calculateThreePointSaddle: 分数高度按比例计算', () => {
  const result = calculateThreePointSaddle(1.5, 60);
  assert.ok(result);
  assert.ok(Math.abs(result.markSpacingInches - 3.0) < 1e-9);
  const positions = result.marks.map((mark) => mark.fromCenterInches);
  assert.ok(Math.abs(positions[0] + 3.0) < 1e-9);
  assert.equal(positions[1], 0);
  assert.ok(Math.abs(positions[2] - 3.0) < 1e-9);
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
