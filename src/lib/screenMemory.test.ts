import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { HistoryStorage } from './historyStore.ts';
import {
  createScreenMemoryStore,
  parseScreenMemory,
  SCREEN_MEMORY_KEY_PREFIX,
  screenMemoryStorageKey,
  serializeScreenMemory,
} from './screenMemory.ts';

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

const initial = { heightText: '', angle: 30 };

test('screenMemoryStorageKey: 使用统一前缀', () => {
  assert.equal(screenMemoryStorageKey('offset'), '@cbc:screen:offset');
  assert.equal(SCREEN_MEMORY_KEY_PREFIX, '@cbc:screen:');
});

test('parseScreenMemory: 空值/损坏数据回退初始值', () => {
  assert.deepEqual(parseScreenMemory(null, initial), initial);
  assert.deepEqual(parseScreenMemory('not json', initial), initial);
  assert.deepEqual(parseScreenMemory('[]', initial), initial);
  assert.deepEqual(parseScreenMemory('42', initial), initial);
});

test('parseScreenMemory: 合法对象与初始值合并', () => {
  assert.deepEqual(
    parseScreenMemory('{"heightText":"6\\""}', initial),
    { heightText: '6"', angle: 30 },
  );
  assert.deepEqual(
    parseScreenMemory(serializeScreenMemory({ heightText: '9"', angle: 45 }), initial),
    { heightText: '9"', angle: 45 },
  );
});

test('store: load/save/clear 往返', async () => {
  const storage = createMemoryStorage();
  const store = createScreenMemoryStore(storage);

  assert.deepEqual(await store.load('offset', initial), initial);

  await store.save('offset', { heightText: '6"', angle: 45 });
  assert.equal(
    storage.data.get('@cbc:screen:offset'),
    '{"heightText":"6\\"","angle":45}',
  );
  assert.deepEqual(await store.load('offset', initial), { heightText: '6"', angle: 45 });

  await store.clear('offset');
  assert.deepEqual(await store.load('offset', initial), initial);
  assert.equal(storage.data.has('@cbc:screen:offset'), false);
});

test('store: 屏幕键互相隔离', async () => {
  const storage = createMemoryStorage();
  const store = createScreenMemoryStore(storage);
  await store.save('offset', { heightText: '6"', angle: 45 });
  await store.save('stub', { heightText: '12"' });
  assert.deepEqual(await store.load('offset', initial), { heightText: '6"', angle: 45 });
  assert.deepEqual(await store.load('stub', { heightText: '' }), { heightText: '12"' });
});
