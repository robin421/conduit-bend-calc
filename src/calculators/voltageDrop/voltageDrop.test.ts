import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculateVoltageDrop, smallestSizeWithinDrop } from './voltageDrop.ts';

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test('calculateVoltageDrop: 单相 12 AWG 铜、16 A、100 ft、120 V', () => {
  const r = calculateVoltageDrop({ metal: 'copper', size: '12', amps: 16, lengthFt: 100, volts: 120, phase: 1 });
  assert.ok(r);
  close(r.dropVolts, (2 * 100 * 1.98 * 16) / 1000); // 6.336 V
  close(r.dropFraction, 6.336 / 120);
  close(r.endVolts, 120 - 6.336);
});

test('calculateVoltageDrop: 三相用 √3', () => {
  const r = calculateVoltageDrop({ metal: 'aluminum', size: '1/0', amps: 100, lengthFt: 200, volts: 480, phase: 3 });
  assert.ok(r);
  close(r.dropVolts, (Math.sqrt(3) * 200 * 0.201 * 100) / 1000);
});

test('smallestSizeWithinDrop: 3% 限值下 16 A / 100 ft / 120 V 需要 8 AWG', () => {
  assert.equal(smallestSizeWithinDrop({ metal: 'copper', amps: 16, lengthFt: 100, volts: 120, phase: 1 }, 0.03), '8');
  assert.equal(smallestSizeWithinDrop({ metal: 'copper', amps: 16, lengthFt: 100, volts: 120, phase: 1 }, 0.05), '10');
});

test('calculateVoltageDrop: 非法输入返回 null；14 AWG 铝不在表内', () => {
  assert.equal(calculateVoltageDrop({ metal: 'copper', size: '12', amps: 0, lengthFt: 100, volts: 120, phase: 1 }), null);
  assert.equal(calculateVoltageDrop({ metal: 'copper', size: '12', amps: 10, lengthFt: -1, volts: 120, phase: 1 }), null);
  assert.equal(calculateVoltageDrop({ metal: 'aluminum', size: '14', amps: 10, lengthFt: 50, volts: 120, phase: 1 }), null);
});
