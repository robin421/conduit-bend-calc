import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  defaultUnitForLocale,
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

test('defaultUnitForLocale: 无明确地区码或美制地区默认 fractional', () => {
  assert.equal(defaultUnitForLocale(undefined), 'fractional');
  assert.equal(defaultUnitForLocale(null), 'fractional');
  assert.equal(defaultUnitForLocale(''), 'fractional');
  assert.equal(defaultUnitForLocale('en'), 'fractional');
  assert.equal(defaultUnitForLocale('es'), 'fractional');
  assert.equal(defaultUnitForLocale('en-Latn'), 'fractional');
  assert.equal(defaultUnitForLocale('en-US'), 'fractional');
  assert.equal(defaultUnitForLocale('es-US'), 'fractional');
  assert.equal(defaultUnitForLocale('en_us'), 'fractional');
  assert.equal(defaultUnitForLocale('en-Latn-US'), 'fractional');
  assert.equal(defaultUnitForLocale('en-LR'), 'fractional');
  assert.equal(defaultUnitForLocale('my-MM'), 'fractional');
});

test('defaultUnitForLocale: 明确公制地区默认 metric', () => {
  for (const locale of [
    'es-MX',
    'es_mx',
    'es-ES',
    'es-CO',
    'es-AR',
    'es-CL',
    'es-PE',
    'es-419',
    'en-GB',
    'en-CA',
    'en-AU',
    'de-DE',
    'fr-FR',
    'zh-Hans-CN',
    'ja-JP',
  ]) {
    assert.equal(defaultUnitForLocale(locale), 'metric', `expected metric for ${locale}`);
  }
});
