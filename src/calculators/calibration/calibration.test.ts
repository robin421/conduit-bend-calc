import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultBenderSpec } from '../geometry/benderSpecs.ts';
import {
  applyExpectedActualCorrection,
  buildCalibratedSpec,
  calibrateDeductFromStub,
  calibrateFromTestBend,
  calibrateGain,
  calibrateStubTakeUp,
  estimateRadiusFromDeduct,
  expectedActualError,
} from './calibration.ts';

test('calibrateGain: L₀=30、A=17、B=14.3 → G=1.3、R≈3.03', () => {
  const result = calibrateGain(30, 17, 14.3);
  assert.ok(result);
  assert.ok(Math.abs(result.gain - 1.3) < 1e-9);
  assert.ok(Math.abs(result.radius - 3.03) < 0.01);
});

test('calibrateGain: G<=0 或非法输入返回 null', () => {
  assert.equal(calibrateGain(40, 17, 14.3), null);
  assert.equal(calibrateGain(0, 17, 14.3), null);
});

test('calibrateStubTakeUp: old=5、target=12、actual=12.4 → 5.4', () => {
  assert.equal(calibrateStubTakeUp(5, 12, 12.4), 5.4);
  assert.equal(calibrateStubTakeUp(5, 12, 0), null);
});

test('buildCalibratedSpec: 校准值优先，未校准沿用基准', () => {
  const base = defaultBenderSpec();
  const spec = buildCalibratedSpec('我的弯管机', base, 3.03, 5.4);
  assert.ok(spec);
  assert.equal(spec.brand, 'Custom');
  assert.equal(spec.centerlineRadius, 3.03);
  assert.equal(spec.takeUp, 5.4);
  const partial = buildCalibratedSpec('只校R', base, 3.03, null);
  assert.ok(partial);
  assert.equal(partial.takeUp, base.takeUp);
  assert.equal(buildCalibratedSpec('  ', base, 3.03, 5.4), null);
});

test('calibrateDeductFromStub: 12" 标记 + S=17 3/8" → 5 3/8"', () => {
  assert.equal(calibrateDeductFromStub(12, 17.375), 5.375);
  assert.equal(calibrateDeductFromStub(12, 12), null);
  assert.equal(calibrateDeductFromStub(12, 11), null);
  assert.equal(calibrateDeductFromStub(0, 17), null);
  assert.equal(calibrateDeductFromStub(12, Number.NaN), null);
});

test('estimateRadiusFromDeduct: 按 deduct 比例估计半径', () => {
  assert.equal(estimateRadiusFromDeduct(4, 5, 5.375), 4.3);
  assert.equal(estimateRadiusFromDeduct(4, 5, 10), 8);
  assert.equal(estimateRadiusFromDeduct(4, 0, 5), null);
  assert.equal(estimateRadiusFromDeduct(4, 5, -1), null);
});

test('calibrateFromTestBend: 反推 deduct + 估计 radius', () => {
  const result = calibrateFromTestBend(12, 17.375, 4, 5);
  assert.ok(result);
  assert.equal(result.actualDeduct, 5.375);
  assert.equal(result.estimatedRadius, 4.3);
  assert.equal(result.markDistanceInches, 12);
});

test('calibrateFromTestBend: 非法输入返回 null', () => {
  assert.equal(calibrateFromTestBend(12, 11, 4, 5), null);
  assert.equal(calibrateFromTestBend(12, 17.375, 4, 0), null);
});

test('expectedActualError: actual − expected', () => {
  assert.equal(expectedActualError(10, 10.5), 0.5);
  assert.equal(expectedActualError(10, 9.75), -0.25);
  assert.equal(expectedActualError(Number.NaN, 10), null);
});

test('applyExpectedActualCorrection: 误差累加到校正量', () => {
  const first = applyExpectedActualCorrection(0, 10, 10.5);
  assert.deepEqual(first, { error: 0.5, offset: 0.5 });
  const second = applyExpectedActualCorrection(0.5, 12, 11.75);
  assert.deepEqual(second, { error: -0.25, offset: 0.25 });
  assert.equal(applyExpectedActualCorrection(Number.NaN, 10, 11), null);
});
