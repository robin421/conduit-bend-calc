import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  capSeoHistory,
  createSeoHistoryEntry,
  createSeoHistoryStore,
  parseSeoHistory,
  seoHistoryStorageKey,
  serializeSeoHistory,
  SEO_HISTORY_LIMIT,
  type SeoHistoryEntry,
  type SeoHistoryStorage,
} from './seoHistory.ts';

function memoryStorage(initial: Record<string, string> = {}): SeoHistoryStorage & {
  data: Record<string, string>;
} {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    async getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    async setItem(key, value) {
      data[key] = value;
    },
    async removeItem(key) {
      delete data[key];
    },
  };
}

function entryAt(index: number, kind: 'offset' | 'shrink' = 'offset'): SeoHistoryEntry {
  return createSeoHistoryEntry({
    kind,
    inputSummary: `input ${index}`,
    summary: `result ${index}`,
    params: { heightText: String(index) },
    signature: `sig-${index}`,
  });
}

test('seoHistoryStorageKey：按工具页隔离存储键', () => {
  assert.equal(seoHistoryStorageKey('offset'), 'bendcalc:seo-history:offset:v1');
  assert.notEqual(seoHistoryStorageKey('offset'), seoHistoryStorageKey('shrink'));
});

test('capSeoHistory：只保留最新 5 条', () => {
  const entries = [0, 1, 2, 3, 4, 5, 6].map((n) => entryAt(n));
  assert.deepEqual(
    capSeoHistory(entries).map((e) => e.summary),
    ['result 0', 'result 1', 'result 2', 'result 3', 'result 4'],
  );
  assert.equal(SEO_HISTORY_LIMIT, 5);
});

test('add：新记录置顶且超过 5 条挤掉最旧', async () => {
  const storage = memoryStorage();
  const store = createSeoHistoryStore(storage, 'offset');
  for (let i = 0; i < 7; i += 1) {
    await store.add(entryAt(i));
  }
  const entries = await store.load();
  assert.equal(entries.length, 5);
  assert.deepEqual(
    entries.map((e) => e.signature),
    ['sig-6', 'sig-5', 'sig-4', 'sig-3', 'sig-2'],
  );
});

test('add：最新一条 signature 相同时不重复写入', async () => {
  const storage = memoryStorage();
  const store = createSeoHistoryStore(storage, 'offset');
  await store.add(entryAt(1));
  await store.add(entryAt(1));
  const entries = await store.load();
  assert.equal(entries.length, 1);
});

test('parseSeoHistory：损坏数据回退空数组，不抛异常', () => {
  assert.deepEqual(parseSeoHistory(null), []);
  assert.deepEqual(parseSeoHistory('not json'), []);
  assert.deepEqual(parseSeoHistory('{"a":1}'), []);
  assert.deepEqual(parseSeoHistory('[{"id":"x"}]'), []);
});

test('serialize/parse：往返一致', () => {
  const entries = [entryAt(1), entryAt(2)];
  assert.deepEqual(parseSeoHistory(serializeSeoHistory(entries)), entries);
});

test('clear：清空该工具页历史', async () => {
  const storage = memoryStorage();
  const store = createSeoHistoryStore(storage, 'offset');
  await store.add(entryAt(1));
  await store.clear();
  assert.deepEqual(await store.load(), []);
});
