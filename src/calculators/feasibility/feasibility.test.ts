import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findBenderSpec } from '../geometry/benderSpecs.ts';
import {
  developedLengthFromBends,
  evaluateFeasibility,
  offsetFeasibility,
  stubFeasibility,
  threePointSaddleFeasibility,
  OPERATION_MARGIN_INCHES,
} from './feasibility.ts';

const spec = findBenderSpec('Ideal', '74-026', '1/2" EMT');
assert.ok(spec);

test('offsetFeasibility: 充足间距 → feasible', () => {
  const result = offsetFeasibility(12, 45, spec!);
  assert.equal(result.status, 'feasible');
  assert.ok(result.minimumConduitInches !== null);
  assert.ok(result.remainingStraightInches !== null && result.remainingStraightInches > 0);
});

test('offsetFeasibility: 直段略小 → tight，给替代角度与最小管长', () => {
  const result = offsetFeasibility(4.5, 45, spec!);
  assert.equal(result.status, 'tight');
  assert.ok(result.suggestions.some((s) => s.includes('Try 30°')));
  assert.ok(result.suggestions.some((s) => s.includes('Minimum conduit required')));
  assert.equal(result.alternateAngleDeg, 30);
});

test('offsetFeasibility: 标记重叠 → impossible', () => {
  const result = offsetFeasibility(3, 45, spec!);
  assert.equal(result.status, 'impossible');
  assert.ok(result.messages.some((m) => m.toLowerCase().includes('overlap')));
});

test('stubFeasibility: 低于 bender 最小 stub → impossible', () => {
  const greenlee = findBenderSpec('Greenlee', '1800', '1/2" Rigid');
  assert.ok(greenlee);
  assert.equal(stubFeasibility(5, greenlee!).status, 'impossible');
  assert.equal(stubFeasibility(12, greenlee!).status, 'feasible');
});

test('threePointSaddleFeasibility: 正常 → feasible', () => {
  const result = threePointSaddleFeasibility(15, 45, spec!);
  assert.equal(result.status, 'feasible');
});

test('evaluateFeasibility: 料长不足 → impossible', () => {
  const developed = developedLengthFromBends(
    [
      { thetaDeg: 45, vertexDistanceToNext: 12 },
      { thetaDeg: 45 },
    ],
    spec!.centerlineRadius,
  );
  assert.ok(developed !== null);
  const result = evaluateFeasibility({
    bends: [
      { thetaDeg: 45, vertexDistanceToNext: 12 },
      { thetaDeg: 45 },
    ],
    radius: spec!.centerlineRadius,
    conduitLengthInches: 5,
    spec: spec!,
    angleDeg: 45,
  });
  assert.equal(result.status, 'impossible');
  assert.ok(result.messages.some((m) => m.includes('Not enough conduit')));
});

test('evaluateFeasibility: minimum conduit = 展开长 + 2"', () => {
  const bends = [
    { thetaDeg: 30, vertexDistanceToNext: 12 },
    { thetaDeg: 30 },
  ];
  const developed = developedLengthFromBends(bends, spec!.centerlineRadius);
  const result = evaluateFeasibility({
    bends,
    radius: spec!.centerlineRadius,
    spec: spec!,
  });
  assert.ok(developed !== null && result.minimumConduitInches !== null);
  assert.ok(
    Math.abs(result.minimumConduitInches - (developed + OPERATION_MARGIN_INCHES)) < 1e-9,
  );
});
