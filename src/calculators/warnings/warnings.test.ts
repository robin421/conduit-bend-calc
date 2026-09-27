import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findBenderSpec } from '../geometry/benderSpecs.ts';
import {
  fourPointSaddleWarnings,
  kicked90Warnings,
  offsetWarnings,
  stubWarnings,
  threePointSaddleWarnings,
} from './warnings.ts';

test('offsetWarnings: H=1、θ=60°、R=5.5 → 红色「这个弯做不出来」', () => {
  const spec = findBenderSpec('Greenlee', '555', '1/2" EMT');
  assert.ok(spec);
  const bigRadius = { ...spec, centerlineRadius: 5.5 };
  // H·csc60° ≈ 1.155；直段 = 1.155 − 2×5.5×tan30° < 0
  const tight = offsetWarnings(1.155, 60, bigRadius);
  assert.ok(tight.some((w) => w.level === 'error'));
  assert.ok(tight.some((w) => w.message.includes('这个弯做不出来')));
});

test('offsetWarnings: 正常尺寸无红色预警', () => {
  const spec = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(spec);
  const warnings = offsetWarnings(12, 30, spec);
  assert.ok(!warnings.some((w) => w.level === 'error'));
});

test('stubWarnings: Greenlee 1800 1/2" Rigid 高度 5" < min 6.5" → 橙色预警', () => {
  const spec = findBenderSpec('Greenlee', '1800', '1/2" Rigid');
  assert.ok(spec);
  const warnings = stubWarnings(5, spec);
  assert.ok(warnings.some((w) => w.level === 'warning'));
});

test('stubWarnings: 无 min stub 数据的规格不预警', () => {
  const spec = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(spec);
  const warnings = stubWarnings(1, spec);
  assert.ok(!warnings.some((w) => w.level === 'warning'));
});

test('stubWarnings: 1/2" 管 R < 4" → NEC 提示', () => {
  const spec = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(spec);
  const smallR = { ...spec, centerlineRadius: 3 };
  const warnings = stubWarnings(12, smallR);
  assert.ok(warnings.some((w) => w.level === 'info' && w.message.includes('NEC')));
  const okR = stubWarnings(12, spec);
  assert.ok(!okR.some((w) => w.level === 'info'));
});

test('saddle 预警：三点/四点正常尺寸不报红', () => {
  const spec = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(spec);
  assert.ok(!threePointSaddleWarnings(6, 30, spec).some((w) => w.level === 'error'));
  assert.ok(!fourPointSaddleWarnings(6, 4, 30, spec).some((w) => w.level === 'error'));
});

test('kicked90Warnings: L > 0 时不报红', () => {
  const spec = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(spec);
  const warnings = kicked90Warnings(15, 10, spec);
  assert.ok(!warnings.some((w) => w.level === 'error'));
});
