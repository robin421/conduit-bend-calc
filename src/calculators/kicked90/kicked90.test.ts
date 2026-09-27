import assert from 'node:assert/strict';
import { test } from 'node:test';

import { gain } from '../geometry/geometry.ts';
import { calculateKicked90 } from './kicked90.ts';

test('calculateKicked90: κ=15°、L=10 → 两弯 marks 与总 gain', () => {
  const result = calculateKicked90(15, 10, 4.625);
  assert.ok(result);
  assert.equal(result.kickAngleDeg, 15);
  assert.equal(result.straightLength, 10);
  const g90 = gain(4.625, Math.PI / 2);
  const gk = gain(4.625, (15 * Math.PI) / 180);
  assert.ok(g90 !== null && gk !== null);
  assert.ok(Math.abs(result.totalGain - (g90 + gk)) < 1e-12);
  assert.equal(result.marks.length, 2);
  assert.equal(result.marks[0]?.developedInches, 0);
  const expectedKickStart = 4.625 * (Math.PI / 2) + 10;
  assert.ok(
    Math.abs((result.marks[1]?.developedInches ?? -1) - expectedKickStart) < 1e-9,
  );
  assert.ok(result.geometry);
});

test('calculateKicked90: κ 参数化，非法输入返回 null', () => {
  assert.ok(calculateKicked90(30, 10, 4.625));
  assert.equal(calculateKicked90(0, 10, 4.625), null);
  assert.equal(calculateKicked90(90, 10, 4.625), null);
  assert.equal(calculateKicked90(15, 0, 4.625), null);
  assert.equal(calculateKicked90(15, 10, -1), null);
});
