import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  parseUnitSystem,
  serializeUnitSystem,
  UNIT_SYSTEM_STORAGE_KEY,
} from './unitStore.ts';

test('parseUnitSystem: 仅 metric 为 metric，其余回退 imperial', () => {
  assert.equal(parseUnitSystem('metric'), 'metric');
  assert.equal(parseUnitSystem('imperial'), 'imperial');
  assert.equal(parseUnitSystem(null), 'imperial');
  assert.equal(parseUnitSystem('bogus'), 'imperial');
});

test('serializeUnitSystem: 往返', () => {
  assert.equal(serializeUnitSystem('metric'), 'metric');
  assert.equal(parseUnitSystem(serializeUnitSystem('imperial')), 'imperial');
});

test('storage key 稳定', () => {
  assert.equal(UNIT_SYSTEM_STORAGE_KEY, 'bendcalc:unit-system:v1');
});
