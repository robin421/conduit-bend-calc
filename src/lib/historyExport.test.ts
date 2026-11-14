import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportHistoryWhenActive } from './historyExport.ts';

test('读取历史期间离开页面，迟到结果不弹分享', async () => {
  let active = true;
  let release!: (text: string) => void;
  let shares = 0;
  const operation = exportHistoryWhenActive({
    isUnlocked: () => true, isActive: () => active,
    readText: () => new Promise((resolve) => { release = resolve; }),
    share: async () => { shares++; },
  });
  active = false;
  release('my bends');
  assert.equal(await operation, false);
  assert.equal(shares, 0);
});

import type { GrowthEvent, GrowthEventParams } from './growthEvents.ts';

test('未解锁不读取或分享，已解锁时显式操作可分享并上报 history_exported', async () => {
  let text = '';
  const events: Array<{ name: GrowthEvent; params: GrowthEventParams }> = [];
  const options = {
    isUnlocked: () => false,
    isActive: () => true,
    readText: async () => 'my bends',
    share: async (value: string) => { text = value; },
    onEvent: (name: GrowthEvent, params: GrowthEventParams) => { events.push({ name, params }); },
  };
  await assert.rejects(exportHistoryWhenActive(options));
  assert.equal(text, '');
  assert.deepEqual(events, []);
  assert.equal(await exportHistoryWhenActive({ ...options, isUnlocked: () => true }), true);
  assert.equal(text, 'my bends');
  assert.deepEqual(events, [{ name: 'history_exported', params: { source: 'history' } }]);
});
