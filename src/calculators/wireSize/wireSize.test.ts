import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculateWireSize, defaultTempColumn } from './wireSize.ts';

test('calculateWireSize: 常见支路（铜，60°C 默认列）', () => {
  assert.equal(calculateWireSize({ metal: 'copper', amps: 15, continuous: false })?.size, '14');
  assert.equal(calculateWireSize({ metal: 'copper', amps: 20, continuous: false })?.size, '12');
  assert.equal(calculateWireSize({ metal: 'copper', amps: 30, continuous: false })?.size, '10');
  assert.equal(calculateWireSize({ metal: 'copper', amps: 100, continuous: false })?.size, '1');
});

test('calculateWireSize: 连续负载 ×125%', () => {
  const r = calculateWireSize({ metal: 'copper', amps: 16, continuous: true });
  assert.ok(r);
  assert.equal(r.requiredAmps, 20);
  assert.equal(r.size, '12');
});

test('calculateWireSize: 240.4(D) 小导线规则（25 A 铜 75°C 不能用 12 AWG）', () => {
  const r = calculateWireSize({ metal: 'copper', amps: 25, continuous: false, column: 75 });
  assert.ok(r);
  assert.equal(r.size, '10');
  assert.equal(r.smallConductorRuleApplied, true);
});

test('calculateWireSize: >100 A 默认 75°C 列；铝', () => {
  assert.equal(defaultTempColumn(100), 60);
  assert.equal(defaultTempColumn(101), 75);
  assert.equal(calculateWireSize({ metal: 'copper', amps: 200, continuous: false })?.size, '3/0');
  // 200 A 铝：4/0 只有 180 A，需要 250 kcmil（4/0 铝做住宅进户线是 310.12 的规则，这里不适用）
  assert.equal(calculateWireSize({ metal: 'aluminum', amps: 200, continuous: false })?.size, '250');
  assert.equal(calculateWireSize({ metal: 'aluminum', amps: 100, continuous: false, column: 75 })?.size, '1');
});

test('calculateWireSize: 非法输入或超出表格返回 null', () => {
  assert.equal(calculateWireSize({ metal: 'copper', amps: 0, continuous: false }), null);
  assert.equal(calculateWireSize({ metal: 'copper', amps: 450, continuous: false, column: 75 }), null);
});
