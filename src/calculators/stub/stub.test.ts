import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findBenderSpec } from '../geometry/benderSpecs.ts';
import { calculateStubUpMark } from '../geometry/geometry.ts';
import { calculateStub } from './stub.ts';

test('calculateStub: PRD AC2 目标 12" + take-up 5" → 标记点 7"', () => {
  const result = calculateStub(12, 5);
  assert.ok(result);
  assert.equal(result.markPoint, 7);
  assert.equal(result.takeUp, 5);
});

test('calculateStub: PRD 第 10 节各 EMT 规格 take-up', () => {
  assert.equal(calculateStub(12, 5)?.markPoint, 7);
  assert.equal(calculateStub(12, 6)?.markPoint, 6);
  assert.equal(calculateStub(12, 8)?.markPoint, 4);
});

test('calculateStub: 支持分数英寸目标高度', () => {
  assert.equal(calculateStub(27.5, 5)?.markPoint, 22.5);
});

test('calculateStub: 非法目标高度返回 null', () => {
  assert.equal(calculateStub(0, 5), null);
  assert.equal(calculateStub(-12, 5), null);
  assert.equal(calculateStub(Number.NaN, 5), null);
  assert.equal(calculateStub(Number.POSITIVE_INFINITY, 5), null);
});

test('calculateStub: 非法 take-up 返回 null', () => {
  assert.equal(calculateStub(12, 0), null);
  assert.equal(calculateStub(12, -5), null);
  assert.equal(calculateStub(12, Number.NaN), null);
});

test('calculateStub: take-up 不小于目标高度返回 null', () => {
  assert.equal(calculateStub(5, 5), null);
  assert.equal(calculateStub(4, 5), null);
});

test('T15 回归：引擎 stubUp 与老 calculateStub 标记点一致', () => {
  const cases: Array<[number, 'Klein' | 'Ideal' | 'Greenlee', string, string]> = [
    [12, 'Klein', '51603', '1/2" EMT'],
    [12, 'Ideal', '74-027', '3/4" EMT'],
    [20, 'Greenlee', '1800', '1" Rigid'],
  ];
  for (const [height, brand, model, conduit] of cases) {
    const spec = findBenderSpec(brand, model, conduit);
    assert.ok(spec);
    const viaEngine = calculateStubUpMark(height, spec);
    const legacy = calculateStub(height, spec.takeUp);
    assert.ok(viaEngine !== null && legacy !== null);
    assert.ok(Math.abs(viaEngine - legacy.markPoint) <= 1 / 16);
  }
});
