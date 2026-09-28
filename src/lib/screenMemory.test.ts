import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { HistoryStorage } from './historyStore.ts';
import {
  createScreenMemoryRestoreGuard,
  createScreenMemoryStore,
  parseScreenMemory,
  SCREEN_MEMORY_KEY_PREFIX,
  screenMemoryStorageKey,
  serializeScreenMemory,
  settleRestoredMemory,
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

test('useScreenMemory: 恢复完成前调用 setter，迟到的恢复值不生效（当前状态优先）', () => {
  const guard = createScreenMemoryRestoreGuard();
  let state = { ...initial };
  const setMemory = (next: typeof initial) => {
    guard.markModified();
    state = next;
  };

  // 用户在异步恢复完成前回填/输入
  setMemory({ heightText: '5"', angle: 45 });
  // 迟到的恢复结果返回，不得覆盖当前状态
  settleRestoredMemory(guard, { heightText: '9"', angle: 22.5 }, (value) => {
    state = value;
  });

  assert.deepEqual(state, { heightText: '5"', angle: 45 });
  assert.equal(guard.isLoaded(), true);
});

test('useScreenMemory: 恢复完成前未调用 setter，恢复值生效', () => {
  const guard = createScreenMemoryRestoreGuard();
  let state = { ...initial };

  settleRestoredMemory(guard, { heightText: '9"', angle: 22.5 }, (value) => {
    state = value;
  });

  assert.deepEqual(state, { heightText: '9"', angle: 22.5 });
  assert.equal(guard.isLoaded(), true);
});

test('useScreenMemory: key 变化重置守卫，恢复值再次生效', () => {
  const guard = createScreenMemoryRestoreGuard();
  let state = { ...initial };
  const setMemory = (next: typeof initial) => {
    guard.markModified();
    state = next;
  };

  setMemory({ heightText: '5"', angle: 45 });
  settleRestoredMemory(guard, { heightText: '9"', angle: 22.5 }, (value) => {
    state = value;
  });
  assert.deepEqual(state, { heightText: '5"', angle: 45 });

  guard.reset();
  settleRestoredMemory(guard, { heightText: '12"', angle: 60 }, (value) => {
    state = value;
  });
  assert.deepEqual(state, { heightText: '12"', angle: 60 });
});

test('store: 屏幕键互相隔离', async () => {
  const storage = createMemoryStorage();
  const store = createScreenMemoryStore(storage);
  await store.save('offset', { heightText: '6"', angle: 45 });
  await store.save('stub', { heightText: '12"' });
  assert.deepEqual(await store.load('offset', initial), { heightText: '6"', angle: 45 });
  assert.deepEqual(await store.load('stub', { heightText: '' }), { heightText: '12"' });
});
