import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultBenderSpec } from '../calculators/geometry/benderSpecs.ts';
import type { BenderSpec } from '../constants.ts';
import type { HistoryStorage } from './historyStore.ts';
import {
  BENDER_SPEC_STORAGE_KEY,
  createBenderSpecStore,
  isValidBenderSpec,
  parseBenderSpec,
  serializeBenderSpec,
} from './benderSpecStore.ts';

function createMemoryStorage(): HistoryStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => Promise.resolve(data.get(key) ?? null),
    setItem: (key: string, value: string) => {
      data.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      data.delete(key);
      return Promise.resolve();
    },
  };
}

const specA: BenderSpec = {
  brand: 'Klein',
  model: '51603',
  conduit: '1/2" EMT',
  centerlineRadius: 4.625,
  takeUp: 5,
};

test('parseBenderSpec: 空值/损坏数据回退默认规格', () => {
  const fallback = defaultBenderSpec();
  assert.deepEqual(parseBenderSpec(null), fallback);
  assert.deepEqual(parseBenderSpec(''), fallback);
  assert.deepEqual(parseBenderSpec('not json'), fallback);
  assert.deepEqual(parseBenderSpec('[]'), fallback);
  assert.deepEqual(parseBenderSpec('{"brand":""}'), fallback);
  assert.deepEqual(
    parseBenderSpec(
      JSON.stringify({ brand: 'Klein', conduit: '1/2" EMT', centerlineRadius: -1 }),
    ),
    fallback,
  );
  assert.deepEqual(
    parseBenderSpec(
      JSON.stringify({
        brand: 'Klein',
        conduit: '1/2" EMT',
        centerlineRadius: Number.POSITIVE_INFINITY,
      }),
    ),
    fallback,
  );
});

test('parseBenderSpec: 合法规格原样返回', () => {
  assert.deepEqual(parseBenderSpec(serializeBenderSpec(specA)), specA);
});

test('isValidBenderSpec: 最小必要字段校验', () => {
  assert.equal(isValidBenderSpec(specA), true);
  assert.equal(
    isValidBenderSpec({
      brand: 'Custom',
      conduit: 'My bender',
      centerlineRadius: 4.7,
    }),
    true,
  );
  assert.equal(isValidBenderSpec(null), false);
  assert.equal(isValidBenderSpec('spec'), false);
  assert.equal(
    isValidBenderSpec({ brand: '  ', conduit: 'x', centerlineRadius: 4 }),
    false,
  );
  assert.equal(
    isValidBenderSpec({ brand: 'x', conduit: '', centerlineRadius: 4 }),
    false,
  );
  assert.equal(
    isValidBenderSpec({ brand: 'x', conduit: 'y', centerlineRadius: 0 }),
    false,
  );
});

test('store: 无存储时加载默认，save 后持久化并可回读', async () => {
  const storage = createMemoryStorage();
  const store = createBenderSpecStore(storage);
  assert.deepEqual(await store.load(), defaultBenderSpec());

  await store.save(specA);
  assert.deepEqual(await store.load(), specA);
  assert.equal(storage.data.has(BENDER_SPEC_STORAGE_KEY), true);
});

test('store: 损坏存储回退默认规格', async () => {
  const storage = createMemoryStorage();
  storage.data.set(BENDER_SPEC_STORAGE_KEY, '{bad json');
  const store = createBenderSpecStore(storage);
  assert.deepEqual(await store.load(), defaultBenderSpec());
});
