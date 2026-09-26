import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OFFSET_CONSTANTS, TAKE_UP_OPTIONS } from './constants.ts';

test('OFFSET_CONSTANTS: PRD 第 10 节 multiplier 逐项一致', () => {
  assert.equal(OFFSET_CONSTANTS[10].multiplier, 6.0);
  assert.equal(OFFSET_CONSTANTS[15].multiplier, 3.9);
  assert.equal(OFFSET_CONSTANTS[22.5].multiplier, 2.6);
  assert.equal(OFFSET_CONSTANTS[30].multiplier, 2.0);
  assert.equal(OFFSET_CONSTANTS[45].multiplier, 1.4);
  assert.equal(OFFSET_CONSTANTS[60].multiplier, 1.2);
});

test('OFFSET_CONSTANTS: PRD 第 10 节 shrinkPerInch 逐项一致', () => {
  assert.equal(OFFSET_CONSTANTS[10].shrinkPerInch, 1 / 16);
  assert.equal(OFFSET_CONSTANTS[15].shrinkPerInch, 1 / 8);
  assert.equal(OFFSET_CONSTANTS[22.5].shrinkPerInch, 3 / 16);
  assert.equal(OFFSET_CONSTANTS[30].shrinkPerInch, 1 / 4);
  assert.equal(OFFSET_CONSTANTS[45].shrinkPerInch, 3 / 8);
  assert.equal(OFFSET_CONSTANTS[60].shrinkPerInch, 1 / 2);
});

test('OFFSET_CONSTANTS: angle 字段与键一致', () => {
  assert.equal(OFFSET_CONSTANTS[10].angle, 10);
  assert.equal(OFFSET_CONSTANTS[15].angle, 15);
  assert.equal(OFFSET_CONSTANTS[22.5].angle, 22.5);
  assert.equal(OFFSET_CONSTANTS[30].angle, 30);
  assert.equal(OFFSET_CONSTANTS[45].angle, 45);
  assert.equal(OFFSET_CONSTANTS[60].angle, 60);
});

test('TAKE_UP_OPTIONS: PRD 第 10 节 take-up 逐项一致', () => {
  const bySize = Object.fromEntries(TAKE_UP_OPTIONS.map((o) => [o.size, o.takeUpInches]));
  assert.equal(bySize['1/2'], 5);
  assert.equal(bySize['3/4'], 6);
  assert.equal(bySize['1'], 8);
});
