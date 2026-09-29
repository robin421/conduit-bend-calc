import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  parseUnitSystem,
  serializeUnitSystem,
  UNIT_SYSTEM_STORAGE_KEY,
} from './unitStore.ts';

test('parseUnitSystem: 三态解析，老版本 imperial 迁移为 fractional', () => {
  assert.equal(parseUnitSystem('metric'), 'metric');
  assert.equal(parseUnitSystem('decimal'), 'decimal');
  assert.equal(parseUnitSystem('fractional'), 'fractional');
  assert.equal(parseUnitSystem('imperial'), 'fractional');
});

test('parseUnitSystem: 非法/空值回退 fractional', () => {
  assert.equal(parseUnitSystem(null), 'fractional');
  assert.equal(parseUnitSystem('bogus'), 'fractional');
  assert.equal(parseUnitSystem(''), 'fractional');
});

test('serializeUnitSystem: 往返', () => {
  for (const unit of ['fractional', 'decimal', 'metric'] as const) {
    assert.equal(serializeUnitSystem(unit), unit);
    assert.equal(parseUnitSystem(serializeUnitSystem(unit)), unit);
  }
});

test('storage key 稳定', () => {
  assert.equal(UNIT_SYSTEM_STORAGE_KEY, 'bendcalc:unit-system:v1');
});
