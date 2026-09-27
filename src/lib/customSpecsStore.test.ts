import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BenderSpec } from '../constants.ts';
import type { HistoryStorage } from './historyStore.ts';
import {
  createCustomSpecsStore,
  CUSTOM_SPECS_STORAGE_KEY,
  parseCustomSpecs,
} from './customSpecsStore.ts';

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
  brand: 'Custom',
  model: 'custom',
  conduit: '1/2" EMT',
  centerlineRadius: 4.7,
  takeUp: 5.1,
  customName: '我的弯管器',
};

const specB: BenderSpec = {
  brand: 'Custom',
  model: 'custom',
  conduit: '3/4" EMT',
  centerlineRadius: 5.6,
  takeUp: 6.2,
  customName: '工地那把',
};

test('upsert/load: 新增规格持久化，最新在前', async () => {
  const store = createCustomSpecsStore(createMemoryStorage());
  assert.deepEqual(await store.load(), []);
  await store.upsert(specA);
  await store.upsert(specB);
  const loaded = await store.load();
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0]?.customName, '工地那把');
  assert.equal(loaded[1]?.customName, '我的弯管器');
});

test('upsert: 同名覆盖不重复', async () => {
  const store = createCustomSpecsStore(createMemoryStorage());
  await store.upsert(specA);
  await store.upsert({ ...specA, takeUp: 5.9 });
  const loaded = await store.load();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0]?.takeUp, 5.9);
});

test('upsert: 非法规格被拒绝', async () => {
  const store = createCustomSpecsStore(createMemoryStorage());
  await store.upsert({ ...specA, takeUp: -1 });
  await store.upsert({ ...specA, brand: 'Ideal' } as BenderSpec);
  assert.deepEqual(await store.load(), []);
});

test('parseCustomSpecs: 损坏数据返回空数组', () => {
  assert.deepEqual(parseCustomSpecs(null), []);
  assert.deepEqual(parseCustomSpecs('not json'), []);
  assert.deepEqual(parseCustomSpecs('{"a":1}'), []);
  assert.deepEqual(parseCustomSpecs(JSON.stringify([specA, { x: 1 }])), [specA]);
});

test('clear: 清空存储', async () => {
  const storage = createMemoryStorage();
  const store = createCustomSpecsStore(storage);
  await store.upsert(specA);
  await store.clear();
  assert.deepEqual(await store.load(), []);
  assert.equal(storage.data.get(CUSTOM_SPECS_STORAGE_KEY), undefined);
});
