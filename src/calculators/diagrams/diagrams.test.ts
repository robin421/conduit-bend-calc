import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatImperial } from '../../lib/imperial.ts';
import type { BendDiagram, DiagramInput } from './diagrams.ts';
import { buildBendDiagram } from './diagrams.ts';

const W = 400;
const H = 180;

function svgDist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function approx(actual: number, expected: number, eps = 1e-6): void {
  assert.ok(
    Math.abs(actual - expected) <= eps,
    `expected ${actual} ≈ ${expected}`,
  );
}

/** 所有点必须落在 viewBox 内 */
function assertInside(d: BendDiagram): void {
  const pts = [
    ...d.marks.map((m) => m.point),
    ...d.dimensions.flatMap((x) => [x.from, x.to, x.labelAt]),
    ...d.angles.map((a) => a.point),
    ...d.notes.map((n) => n.point),
  ];
  for (const p of pts) {
    assert.ok(p.x >= -1e-9 && p.x <= d.width + 1e-9, `x=${p.x} inside`);
    assert.ok(p.y >= -1e-9 && p.y <= d.height + 1e-9, `y=${p.y} inside`);
  }
}

/** tick 方向必须是单位向量 */
function assertTickUnit(d: BendDiagram): void {
  for (const m of d.marks) {
    approx(Math.hypot(m.tickDir.x, m.tickDir.y), 1);
  }
}

test('offset：H=6、θ=30°，M1/M2 间距与 12" 等比对应', () => {
  const input: DiagramInput = {
    kind: 'offset',
    height: 6,
    thetaDeg: 30,
    spacingDisplay: 12,
    shrinkDisplay: 1.5,
  };
  const d = buildBendDiagram(input, W, H);
  assert.ok(d);
  assert.equal(d.marks.length, 2);
  assert.equal(d.marks[0].label, 'M1');
  assert.equal(d.marks[1].label, 'M2');
  // M2 在 M1 的右上方（SVG y 向下，M2.y 更小）
  assert.ok(d.marks[1].point.x > d.marks[0].point.x);
  assert.ok(d.marks[1].point.y < d.marks[0].point.y);
  // 等比锁定：view 尺寸翻倍时，M1/M2 的 SVG 距离也翻倍
  const d2 = buildBendDiagram(input, W * 2, H * 2);
  assert.ok(d2);
  const r1 = svgDist(d.marks[0].point, d.marks[1].point);
  const r2 = svgDist(d2.marks[0].point, d2.marks[1].point);
  approx(r2 / r1, 2);
  // 标注数字与计算值一致
  assert.equal(d.dimensions.length, 1);
  assert.equal(d.dimensions[0].label, formatImperial(12));
  assert.deepEqual(
    d.angles.map((a) => a.text),
    ['30°', '30°'],
  );
  assert.ok(d.notes.some((n) => n.text.includes('shrink')));
  assert.ok(d.notes.some((n) => n.text.includes(formatImperial(1.5))));
  assert.ok(d.conduitPath.startsWith('M'));
  assert.ok(d.conduitPath.includes('L'));
  assertInside(d);
  assertTickUnit(d);
});

test('stub：mark 位置与值标注正确', () => {
  const d = buildBendDiagram({ kind: 'stub', stubHeight: 12, markPoint: 7 }, W, H);
  assert.ok(d);
  assert.equal(d.marks.length, 1);
  assert.equal(d.marks[0].label, 'M1');
  assert.equal(d.marks[0].valueText, formatImperial(7));
  // mark 在管线正上方（SVG y 更小）
  assert.ok(d.marks[0].point.y < H / 2);
  assert.equal(d.dimensions.length, 1);
  assert.equal(d.dimensions[0].label, formatImperial(12));
  assertInside(d);
  assertTickUnit(d);
});

test('saddle3：三处 mark 与角度标注', () => {
  const d = buildBendDiagram(
    { kind: 'saddle3', height: 4, sideSpacingDisplay: 10 },
    W,
    H,
  );
  assert.ok(d);
  assert.equal(d.marks.length, 3);
  assert.deepEqual(
    d.marks.map((m) => m.label),
    ['M1', 'M2', 'M3'],
  );
  assert.deepEqual(
    d.angles.map((a) => a.text),
    ['22.5°', '45°', '22.5°'],
  );
  assert.equal(d.dimensions.length, 2);
  for (const dim of d.dimensions) {
    assert.equal(dim.label, formatImperial(10));
  }
  // 中心 mark M2 在最高处
  const ys = d.marks.map((m) => m.point.y);
  assert.ok(ys[1] < ys[0] && ys[1] < ys[2]);
  assertInside(d);
  assertTickUnit(d);
});

test('saddle4：四处 mark、三段尺寸', () => {
  const d = buildBendDiagram(
    {
      kind: 'saddle4',
      height: 6,
      thetaDeg: 30,
      legSpacingDisplay: 12,
      flatWidth: 8,
    },
    W,
    H,
  );
  assert.ok(d);
  assert.equal(d.marks.length, 4);
  assert.deepEqual(
    d.marks.map((m) => m.label),
    ['M1', 'M2', 'M3', 'M4'],
  );
  assert.equal(d.dimensions.length, 3);
  assert.equal(d.dimensions[0].label, formatImperial(12));
  assert.equal(d.dimensions[1].label, formatImperial(8));
  assert.equal(d.dimensions[2].label, formatImperial(12));
  assert.deepEqual(
    d.angles.map((a) => a.text),
    ['30°', '30°', '30°', '30°'],
  );
  assertInside(d);
  assertTickUnit(d);
});

test('rolling：复用 offset 并带 rise/roll 注释', () => {
  const d = buildBendDiagram(
    {
      kind: 'rolling',
      rise: 6,
      roll: 8,
      trueOffset: 10,
      rollAngleDeg: 53.13,
      thetaDeg: 30,
      spacingDisplay: 20,
      shrinkDisplay: 2.5,
    },
    W,
    H,
  );
  assert.ok(d);
  assert.equal(d.marks.length, 2);
  assert.equal(d.dimensions[0].label, formatImperial(20));
  assert.ok(d.notes.some((n) => n.text.includes(formatImperial(6))));
  assert.ok(d.notes.some((n) => n.text.includes(formatImperial(8))));
  assert.ok(d.notes.some((n) => n.text.includes(formatImperial(10))));
  assertInside(d);
  assertTickUnit(d);
});

test('kicked90：两处 mark、直段与总 gain 标注', () => {
  const d = buildBendDiagram(
    { kind: 'kicked90', kickAngleDeg: 15, straightLength: 10, totalGain: 2.5 },
    W,
    H,
  );
  assert.ok(d);
  assert.equal(d.marks.length, 2);
  assert.deepEqual(
    d.angles.map((a) => a.text),
    ['90°', '15°'],
  );
  assert.equal(d.dimensions.length, 1);
  assert.equal(d.dimensions[0].label, formatImperial(10));
  assert.ok(d.notes.some((n) => n.text.includes(formatImperial(2.5))));
  // M2 在 M1 上方
  assert.ok(d.marks[1].point.y < d.marks[0].point.y);
  assertInside(d);
  assertTickUnit(d);
});

test('非法输入返回 null，不抛异常', () => {
  const bad: DiagramInput[] = [
    { kind: 'offset', height: 0, thetaDeg: 30, spacingDisplay: 12, shrinkDisplay: 1 },
    { kind: 'offset', height: 6, thetaDeg: 0, spacingDisplay: 12, shrinkDisplay: 1 },
    { kind: 'offset', height: NaN, thetaDeg: 30, spacingDisplay: 12, shrinkDisplay: 1 },
    { kind: 'stub', stubHeight: 12, markPoint: 12 },
    { kind: 'stub', stubHeight: -5, markPoint: 2 },
    { kind: 'saddle3', height: 4, sideSpacingDisplay: -1 },
    { kind: 'saddle4', height: 6, thetaDeg: 30, legSpacingDisplay: 12, flatWidth: 0 },
    {
      kind: 'rolling',
      rise: 6,
      roll: 0,
      trueOffset: 6,
      rollAngleDeg: 0,
      thetaDeg: 30,
      spacingDisplay: 12,
      shrinkDisplay: 1,
    },
    { kind: 'kicked90', kickAngleDeg: 95, straightLength: 10, totalGain: 2 },
    { kind: 'kicked90', kickAngleDeg: 15, straightLength: 10, totalGain: -1 },
  ];
  for (const input of bad) {
    assert.equal(buildBendDiagram(input, W, H), null, JSON.stringify(input));
  }
  // view 尺寸非法
  const good: DiagramInput = {
    kind: 'offset',
    height: 6,
    thetaDeg: 30,
    spacingDisplay: 12,
    shrinkDisplay: 1.5,
  };
  assert.equal(buildBendDiagram(good, 100, H), null);
  assert.equal(buildBendDiagram(good, W, 0), null);
  assert.equal(buildBendDiagram(good, NaN, H), null);
});
