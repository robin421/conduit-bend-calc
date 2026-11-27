/**
 * 四个核心计算器（Offset / Stub Up / 3-Point / 4-Point Saddle）的金标准值。
 *
 * 期望值是手算的字面量，不从 OFFSET_CONSTANTS 反推，任何常数或公式漂移都会在这里失败。
 * 依据：docs/PRD.md §10（trade 习惯值）、Ideal/Klein/Greenlee 弯管器手册。
 * App 原生屏与 Web SEO 页共用这些函数，因此两端同时被覆盖。
 *
 * 已知 trade 约定（不是 bug，保持与 PRD 一致）：
 * - 乘数取整（10°=6.0 vs 精确 csc=5.76；60°=1.2 vs 1.155），误差 ≤ 5%。
 * - shrink/in 为行业表值，系统性略小于精确 tan(θ/2)（例如 10°：1/16" vs 0.0875"）。
 * - 3 点鞍 45° 中心用 2.5（精确 csc22.5°=2.613）。
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BENDER_SPECS, OFFSET_ANGLES } from '../constants.ts';
import { calculateStubUpMark } from './geometry/geometry.ts';
import { calculateOffset } from './offset/offset.ts';
import { calculateFourPointSaddle, calculateThreePointSaddle } from './saddle/saddle.ts';

const close = (actual: number | undefined, expected: number, label: string) => {
  assert.ok(actual !== undefined, `${label}: undefined`);
  assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: expected ${expected}, got ${actual}`);
};

test('Offset 6" 障碍：六个预设角度的间距与 shrink', () => {
  const golden: Record<number, [spacing: number, shrink: number, multiplier: number]> = {
    10: [36, 0.375, 6.0],
    15: [23.4, 0.75, 3.9],
    22.5: [15.6, 1.125, 2.6],
    30: [12, 1.5, 2.0],
    45: [8.4, 2.25, 1.4],
    60: [7.2, 3, 1.2],
  };
  assert.deepEqual([...OFFSET_ANGLES].sort((a, b) => a - b), [10, 15, 22.5, 30, 45, 60]);
  for (const angle of OFFSET_ANGLES) {
    const r = calculateOffset(6, angle);
    assert.ok(r, `${angle}°`);
    const [spacing, shrink, multiplier] = golden[angle];
    close(r.distanceBetweenBends, spacing, `${angle}° spacing`);
    close(r.shrink, shrink, `${angle}° shrink`);
    close(r.multiplier, multiplier, `${angle}° multiplier`);
  }
});

test('Offset trade 乘数与精确 csc(θ) 误差 ≤ 5%（防止表值被误改）', () => {
  for (const angle of OFFSET_ANGLES) {
    const r = calculateOffset(1, angle);
    assert.ok(r);
    const exact = 1 / Math.sin((angle * Math.PI) / 180);
    assert.ok(Math.abs(r.multiplier - exact) / exact <= 0.05, `${angle}°: ${r.multiplier} vs ${exact}`);
  }
});

test('Offset 结果不随弯管器 R 改变（显示值为 trade 值）', () => {
  const a = calculateOffset(10, 30, 4.3125);
  const b = calculateOffset(10, 30, 7.375);
  assert.ok(a && b);
  close(a.distanceBetweenBends, 20, 'R=4.3125');
  close(b.distanceBetweenBends, 20, 'R=7.375');
});

test('Offset 非法输入返回 null，不抛异常', () => {
  for (const h of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(calculateOffset(h, 30), null);
  }
});

test('Stub up：mark = 目标高度 − take-up（按弯管器）', () => {
  const find = (brand: string, model: string, conduit: string) => {
    const spec = BENDER_SPECS.find((s) => s.brand === brand && s.model === model && s.conduit === conduit);
    assert.ok(spec, `${brand} ${model} ${conduit}`);
    return spec;
  };
  close(calculateStubUpMark(10, find('Klein', '51603', '1/2" EMT')) ?? undefined, 5, 'Klein 1/2 EMT');
  close(calculateStubUpMark(12, find('Ideal', '74-027', '3/4" EMT')) ?? undefined, 6, 'Ideal 3/4 EMT');
  close(calculateStubUpMark(18, find('Klein', '51605', '1" EMT')) ?? undefined, 10, 'Klein 1 EMT');
  close(calculateStubUpMark(10, find('Greenlee', '555', '1/2" EMT')) ?? undefined, 3, 'Greenlee 555 1/2 EMT (hook)');
  close(calculateStubUpMark(16, find('Greenlee', '555', '1" EMT')) ?? undefined, 5.25, 'Greenlee 555 1 EMT (hook)');
  // 目标高度不大于 take-up → 无法弯出，返回 null。
  assert.equal(calculateStubUpMark(5, find('Klein', '51603', '1/2" EMT')), null);
  assert.equal(calculateStubUpMark(0, find('Klein', '51603', '1/2" EMT')), null);
});

test('3 点鞍 3" 障碍：45° 中心 → 两侧 7.5"、跨度 15"、中心 shrink 9/16"', () => {
  const r = calculateThreePointSaddle(3, 45);
  assert.ok(r);
  close(r.multiplier, 2.5, 'multiplier');
  close(r.markSpacingInches, 7.5, 'side spacing');
  close(r.spanInches, 15, 'span');
  close(r.shrinkInches, 0.5625, 'center shrink');
  assert.deepEqual(r.marks.map((m) => m.fromCenterInches), [-7.5, 0, 7.5]);
});

test('3 点鞍 3" 障碍：60° 中心（30° 两侧）→ 两侧 6"、中心 shrink 3/4"', () => {
  const r = calculateThreePointSaddle(3, 60);
  assert.ok(r);
  close(r.multiplier, 2.0, 'multiplier');
  close(r.markSpacingInches, 6, 'side spacing');
  close(r.shrinkInches, 0.75, 'center shrink');
});

test('4 点鞍 4" 高 × 6" 宽，30°：外侧弯点 ±11"、跨度 22"、总 shrink 2"', () => {
  const r = calculateFourPointSaddle(4, 6, 30);
  assert.ok(r);
  close(r.multiplier, 2.0, 'multiplier');
  close(r.markSpacingInches, 8, 'leg spacing');
  assert.deepEqual(r.marks.map((m) => m.fromCenterInches), [-11, -3, 3, 11]);
  close(r.spanInches, 22, 'span');
  close(r.totalShrinkInches, 2, 'total shrink');
});

test('4 点鞍 4" 高 × 6" 宽，45°：外侧弯点 ±8.6"、总 shrink 3"', () => {
  const r = calculateFourPointSaddle(4, 6, 45);
  assert.ok(r);
  close(r.markSpacingInches, 5.6, 'leg spacing');
  assert.deepEqual(r.marks.map((m) => Math.round(m.fromCenterInches * 1000) / 1000), [-8.6, -3, 3, 8.6]);
  close(r.totalShrinkInches, 3, 'total shrink');
});

test('鞍弯非法宽度/高度返回 null', () => {
  assert.equal(calculateFourPointSaddle(4, 0, 30), null);
  assert.equal(calculateFourPointSaddle(-1, 6, 30), null);
  assert.equal(calculateThreePointSaddle(0, 45), null);
});
