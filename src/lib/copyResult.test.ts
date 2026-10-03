import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildOffsetCopyText,
  buildSaddleCopyText,
  buildShrinkCopyText,
  buildStubCopyText,
} from './copyResult.ts';

test('offset：包含间距 / shrink / 两个 mark 位置', () => {
  const text = buildOffsetCopyText({
    angle: 30,
    spacing: 12,
    shrink: 1.5,
    mark1: 0,
    mark2: 12,
    unit: 'fractional',
  });
  assert.equal(
    text,
    'Offset at 30°: mark spacing 1\', shrink 1-1/2". Mark 1 at 0", mark 2 at 1\'.',
  );
});

test('offset：没有起点时只给 mark 1', () => {
  const text = buildOffsetCopyText({
    angle: 45,
    spacing: 8.4,
    shrink: 2.25,
    mark1: 0,
    mark2: null,
    unit: 'decimal',
  });
  assert.equal(text, 'Offset at 45°: mark spacing 8.4", shrink 2.25". Mark 1 at 0".');
});

test('offset：metric 单位输出 mm', () => {
  const text = buildOffsetCopyText({
    angle: 30,
    spacing: 12,
    shrink: 1.5,
    mark1: 0,
    mark2: 12,
    unit: 'metric',
  });
  assert.match(text, /304\.8 mm/);
  assert.match(text, /38\.1 mm/);
});

test('saddle：包含 span 与 total shrink', () => {
  const text = buildSaddleCopyText({
    angle: 30,
    markSpacing: 8,
    span: 20,
    totalShrink: 2,
    unit: 'decimal',
  });
  assert.equal(
    text,
    '4-point saddle at 30°: mark spacing 8", total span 20", total shrink 2".',
  );
});

test('shrink：区分 offset 与 saddle 文案', () => {
  assert.equal(
    buildShrinkCopyText({ mode: 'offset', angle: 30, shrink: 1.5, unit: 'decimal' }),
    'offset shrink at 30°: 1.5".',
  );
  assert.equal(
    buildShrinkCopyText({ mode: 'saddle', angle: 30, shrink: 3, unit: 'decimal' }),
    '4-point saddle shrink at 30°: 3".',
  );
});

test('stub：包含 mark 位置与 take-up', () => {
  const text = buildStubCopyText({
    sizeLabel: '1/2" EMT',
    takeUp: 5,
    mark: 7,
    unit: 'fractional',
  });
  assert.equal(
    text,
    '90° stub in 1/2" EMT: mark the conduit at 7" from the end (5" take-up).',
  );
});
