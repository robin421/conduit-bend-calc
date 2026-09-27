import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultBenderSpec } from '../geometry/benderSpecs.ts';
import {
  buildCalibratedSpec,
  calibrateGain,
  calibrateStubTakeUp,
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
