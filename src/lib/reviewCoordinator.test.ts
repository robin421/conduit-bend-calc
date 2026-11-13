import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createReviewCoordinator, reviewSignature } from './reviewCoordinator.ts';
import { parseReviewState, REVIEW_STORAGE_KEY } from './inAppReviewStore.ts';
import type { HistoryStorage } from './historyStore.ts';

function memory(seed?: string): HistoryStorage & { data: Map<string, string> } {
  const data = new Map(seed ? [[REVIEW_STORAGE_KEY, seed]] : []);
  return { data, getItem: async (key) => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); }, removeItem: async (key) => { data.delete(key); } };
}
const DAY = 86400000;

test('首次打开即持久化时间；三天前不请求，第三天完成计算后才请求', async () => {
  let now = DAY;
  let calls = 0;
  const storage = memory();
  const coordinator = createReviewCoordinator(storage, { isAvailable: async () => true, request: async () => { calls++; } }, { now: () => now });
  await coordinator.initialize();
  assert.equal(parseReviewState(storage.data.get(REVIEW_STORAGE_KEY)!).firstSeenAt, DAY);
  await Promise.all(['a', 'b', 'c'].map((sig) => coordinator.noteCalculation(sig)));
  assert.equal(await coordinator.requestWhenIdle(() => true), 'ineligible');
  now += 3 * DAY;
  assert.equal(await coordinator.requestWhenIdle(() => true), 'attempted');
  assert.equal(calls, 1);
  assert.equal(await coordinator.requestWhenIdle(() => true), 'ineligible');
});

test('旧计数与冷却保留；默认启动没有新计算时不请求', async () => {
  const storage = memory(JSON.stringify({ firstSeenAt: DAY, successfulCalcCount: 9, lastRequestedAt: 2 * DAY }));
  const coordinator = createReviewCoordinator(storage, { isAvailable: async () => true, request: async () => assert.fail('within cooldown') }, { now: () => 80 * DAY });
  const initial = await coordinator.initialize();
  assert.equal(initial.successfulCalcCount, 9);
  assert.equal(initial.lastRequestedAt, 2 * DAY);
  assert.equal(await coordinator.requestWhenIdle(() => true), 'ineligible');
  await coordinator.noteCalculation('new');
  assert.equal(await coordinator.requestWhenIdle(() => true), 'ineligible');
});

test('并发记录不丢计数，单位切换不重复，不可行计算不计数', async () => {
  const storage = memory();
  const coordinator = createReviewCoordinator(storage, { isAvailable: async () => false, request: async () => undefined });
  await Promise.all([
    coordinator.noteCalculation('offset|6|30|spec|fractional'),
    coordinator.noteCalculation('offset|6|30|spec|metric'),
    coordinator.noteCalculation('offset|8|30|spec|fractional'),
    coordinator.noteCalculation('bad', 'impossible'),
  ]);
  assert.equal(parseReviewState(storage.data.get(REVIEW_STORAGE_KEY)!).successfulCalcCount, 2);
  assert.equal(reviewSignature('offset|6|30|spec|decimal'), 'offset|6|30|spec');
});

test('路由或支付状态阻塞时不消耗冷却；可用性查询途中离开也不弹', async () => {
  let idle = true;
  const storage = memory(JSON.stringify({ firstSeenAt: DAY, successfulCalcCount: 3, lastRequestedAt: null }));
  const coordinator = createReviewCoordinator(storage, { isAvailable: async () => { idle = false; return true; }, request: async () => assert.fail('not idle') }, { now: () => 5 * DAY });
  await coordinator.noteCalculation('new');
  assert.equal(await coordinator.requestWhenIdle(() => false), 'blocked');
  assert.equal(await coordinator.requestWhenIdle(() => idle), 'blocked');
  assert.equal(parseReviewState(storage.data.get(REVIEW_STORAGE_KEY)!).lastRequestedAt, null);
});

test('原生调用失败不抛出，不把完成调用误报为评分成功', async () => {
  const events: string[] = [];
  const storage = memory(JSON.stringify({ firstSeenAt: DAY, successfulCalcCount: 3, lastRequestedAt: null }));
  const coordinator = createReviewCoordinator(storage, { isAvailable: async () => true, request: async () => { throw new Error('native unavailable'); } }, { now: () => 5 * DAY, onEvent: (name) => events.push(name) });
  await coordinator.noteCalculation('new');
  assert.equal(await coordinator.requestWhenIdle(() => true), 'failed');
  assert.equal(await coordinator.requestWhenIdle(() => true), 'ineligible');
  assert.deepEqual(events, ['review_request_attempted', 'review_request_result']);
  assert.equal(parseReviewState(storage.data.get(REVIEW_STORAGE_KEY)!).lastRequestedAt, 5 * DAY);
});
