import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findBenderSpec } from '../geometry/benderSpecs.ts';
import { calculateStubUpMark } from '../geometry/geometry.ts';

function specFor(brand: 'Klein' | 'Ideal' | 'Greenlee', model: string, conduit: string) {
  const spec = findBenderSpec(brand, model, conduit);
  assert.ok(spec, `missing preset ${brand} ${model} ${conduit}`);
  return spec;
}

test('calculateStubUpMark: PRD AC2 目标 12" + take-up 5" → 标记点 7"', () => {
  const spec = specFor('Klein', '51603', '1/2" EMT');
  assert.equal(calculateStubUpMark(12, spec), 7);
});

test('calculateStubUpMark: PRD 第 10 节各 EMT 规格 take-up', () => {
  assert.equal(calculateStubUpMark(12, specFor('Klein', '51603', '1/2" EMT')), 7);
  assert.equal(calculateStubUpMark(12, specFor('Ideal', '74-027', '3/4" EMT')), 6);
  assert.equal(calculateStubUpMark(12, specFor('Klein', '51605', '1" EMT')), 4);
});

test('calculateStubUpMark: 支持分数英寸目标高度', () => {
  assert.equal(calculateStubUpMark(27.5, specFor('Klein', '51603', '1/2" EMT')), 22.5);
});

test('calculateStubUpMark: 非法目标高度返回 null', () => {
  const spec = specFor('Klein', '51603', '1/2" EMT');
  assert.equal(calculateStubUpMark(0, spec), null);
  assert.equal(calculateStubUpMark(-12, spec), null);
  assert.equal(calculateStubUpMark(Number.NaN, spec), null);
  assert.equal(calculateStubUpMark(Number.POSITIVE_INFINITY, spec), null);
});

test('calculateStubUpMark: 非法 take-up 返回 null', () => {
  const spec = { ...specFor('Klein', '51603', '1/2" EMT'), takeUp: 0 };
  assert.equal(calculateStubUpMark(12, spec), null);
});

test('calculateStubUpMark: take-up 不小于目标高度返回 null', () => {
  const spec = specFor('Klein', '51603', '1/2" EMT');
  assert.equal(calculateStubUpMark(5, spec), null);
  assert.equal(calculateStubUpMark(4, spec), null);
});

test('T15 回归：引擎 stubUp 在各规格上可算且为正', () => {
  const cases: Array<[number, 'Klein' | 'Ideal' | 'Greenlee', string, string]> = [
    [12, 'Klein', '51603', '1/2" EMT'],
    [12, 'Ideal', '74-027', '3/4" EMT'],
    [20, 'Greenlee', '1800', '1" Rigid'],
  ];
  for (const [height, brand, model, conduit] of cases) {
    const spec = specFor(brand, model, conduit);
    const viaEngine = calculateStubUpMark(height, spec);
    assert.ok(viaEngine !== null && viaEngine > 0);
  }
});
