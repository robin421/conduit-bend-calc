import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  capHistory,
  createHistoryStore,
  HISTORY_LIMIT,
  parseHistory,
} from './historyStore.ts';
import type { HistoryEntry, HistoryStorage } from './historyStore.ts';
import { parseLength } from './units.ts';
import { HISTORY_CALCULATOR_SCREENS } from './homeContent.ts';

function makeEntry(index: number): HistoryEntry {
  return {
    id: `id-${index}`,
    kind: 'offset',
    title: 'Offset Bend',
    inputSummary: `${index}" · 30°`,
    resultSummary: `${index * 2}"`,
    timestamp: 1_000 + index,
    params: { heightText: `${index}"`, angle: 30 },
    signature: `sig-${index}`,
  };
}

function createMemoryStorage(): HistoryStorage & { dump(): string | null } {
  let value: string | null = null;
  return {
    getItem: async () => value,
    setItem: async (_key, next) => {
      value = next;
    },
    removeItem: async () => {
      value = null;
    },
    dump: () => value,
  };
}

test('capHistory: 只保留最新 limit 条', () => {
  const entries = Array.from({ length: 25 }, (_, i) => makeEntry(i + 1));
  const capped = capHistory(entries);
  assert.equal(capped.length, HISTORY_LIMIT);
  assert.equal(capped[0].id, 'id-1');
  assert.equal(capped[HISTORY_LIMIT - 1].id, `id-${HISTORY_LIMIT}`);
});

test('保存 20 条后第 21 条挤掉最旧，且最新在最前', async () => {
  const storage = createMemoryStorage();
  const store = createHistoryStore(storage);

  for (let i = 1; i <= HISTORY_LIMIT; i += 1) {
    await store.add(makeEntry(i));
  }
  let list = await store.load();
  assert.equal(list.length, HISTORY_LIMIT);
  assert.equal(list[0].id, `id-${HISTORY_LIMIT}`);
  assert.equal(list[list.length - 1].id, 'id-1');

  list = await store.add(makeEntry(HISTORY_LIMIT + 1));
  assert.equal(list.length, HISTORY_LIMIT);
  assert.equal(list[0].id, `id-${HISTORY_LIMIT + 1}`);
  assert.equal(list[list.length - 1].id, 'id-2', '最旧的 id-1 应被挤掉');

  const reloaded = await store.load();
  assert.equal(reloaded.length, HISTORY_LIMIT);
  assert.equal(reloaded[0].id, `id-${HISTORY_LIMIT + 1}`);
  assert.ok(!reloaded.some((entry) => entry.id === 'id-1'));
});

test('连续重复 signature 不重复写入', async () => {
  const storage = createMemoryStorage();
  const store = createHistoryStore(storage);

  await store.add(makeEntry(1));
  const list = await store.add(makeEntry(1));
  assert.equal(list.length, 1);
});

test('clear 清空全部记录', async () => {
  const storage = createMemoryStorage();
  const store = createHistoryStore(storage);
  await store.add(makeEntry(1));
  await store.clear();
  assert.deepEqual(await store.load(), []);
  assert.equal(storage.dump(), null);
});

test('parseHistory: 损坏数据返回空数组且不抛异常', () => {
  assert.deepEqual(parseHistory(null), []);
  assert.deepEqual(parseHistory('not-json'), []);
  assert.deepEqual(parseHistory('{"a":1}'), []);
  assert.deepEqual(parseHistory('[{"id":1}]'), []);
});

test('继续计算保留公制输入、弯管器与导航目标，不把 150 mm 当作 150 英寸', async () => {
  const store = createHistoryStore(createMemoryStorage());
  const entry = makeEntry(1);
  entry.params = { heightText: '150', angle: 30, unit: 'metric', specKey: 'my-rigid-bender' };
  await store.add(entry);
  const [restored] = await store.load();
  assert.equal(HISTORY_CALCULATOR_SCREENS[restored.kind], 'Offset');
  assert.equal(restored.params.specKey, 'my-rigid-bender');
  assert.equal(restored.params.unit, 'metric');
  assert.equal(parseLength(restored.params.heightText!, restored.params.unit!), 150 / 25.4);
});

test('未知历史类型或损坏单位不会成为首页继续计算入口', () => {
  const entry = makeEntry(1);
  assert.deepEqual(parseHistory(JSON.stringify([{ ...entry, kind: 'unknown' }])), []);
  assert.deepEqual(parseHistory(JSON.stringify([{ ...entry, params: { unit: 'unknown' } }])), []);
  assert.deepEqual(parseHistory(JSON.stringify([{ ...entry, params: [] }])), []);
  assert.equal(parseHistory(JSON.stringify([entry])).length, 1, '旧记录未存单位时仍兼容');
});

test('快速切换计算器时并发保存不丢记录，读取等待落盘完成', async () => {
  const store = createHistoryStore(createMemoryStorage());
  const first = store.add(makeEntry(1));
  const second = store.add(makeEntry(2));
  const restored = store.load();
  await Promise.all([first, second]);
  assert.deepEqual((await restored).map((entry) => entry.id), ['id-2', 'id-1']);
});

test('清空与紧接着的新计算按操作顺序处理', async () => {
  const store = createHistoryStore(createMemoryStorage());
  await store.add(makeEntry(1));
  await Promise.all([store.clear(), store.add(makeEntry(2))]);
  assert.deepEqual((await store.load()).map((entry) => entry.id), ['id-2']);
});
