import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPendingProTaskStore, parsePendingProTask, PENDING_PRO_TASK_KEY } from './pendingProTaskStore.ts';
import type { HistoryStorage } from './historyStore.ts';

function memory(): HistoryStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: async (key) => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); }, removeItem: async (key) => { data.delete(key); } };
}

test('旧页面的取消、失败或完成不能清除新页面的同类型任务', async () => {
  const storage = memory();
  let sequence = 0;
  const store = createPendingProTaskStore(storage, () => String(++sequence));
  const a = store.begin({ kind: 'calibration' });
  const b = store.begin({ kind: 'calibration' });
  await Promise.all([a.persisted, b.persisted]);
  assert.equal(await store.clearIfCurrent(a.task.id), false);
  assert.equal((await store.load())?.id, b.task.id);
  assert.equal(parsePendingProTask(storage.data.get(PENDING_PRO_TASK_KEY)!)?.id, b.task.id);
  assert.equal(await store.clearIfCurrent(b.task.id), true);
  assert.equal(await store.load(), null);
});

test('慢写入期间新任务已预留所有权，旧异步分支无法覆盖它', async () => {
  const storage = memory();
  let release!: () => void;
  const firstWrite = new Promise<void>((resolve) => { release = resolve; });
  let count = 0;
  const slow: HistoryStorage = { ...storage, setItem: async (key, value) => {
    if (++count === 1) await firstWrite;
    storage.data.set(key, value);
  } };
  let sequence = 0;
  const store = createPendingProTaskStore(slow, () => String(++sequence));
  const a = store.begin({ kind: 'export' });
  const b = store.begin({ kind: 'calibration' });
  const staleCleanup = store.clearIfCurrent(a.task.id);
  release();
  await Promise.all([a.persisted, b.persisted]);
  assert.equal(await staleCleanup, false);
  assert.deepEqual((await store.load())?.intent, { kind: 'calibration' });
});

test('兼容旧任务并剔除多余字段，未知导航目标不恢复', () => {
  assert.deepEqual(parsePendingProTask('{"kind":"export"}')?.intent, { kind: 'export' });
  assert.deepEqual(parsePendingProTask('{"id":"1","intent":{"kind":"calibration","token":"private"}}'), { id: '1', intent: { kind: 'calibration' } });
  assert.equal(parsePendingProTask('{"id":"1","intent":{"kind":"feasibility","screen":"Other"}}'), null);
});
