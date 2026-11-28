import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HOME_STARTER_STORAGE_KEY,
  homeStarterOffsetParams,
  loadHomeStarterState,
  markHomeStarterUsed,
  shouldShowHomeStarter,
} from './homeStarter.ts';
import { REVIEW_STORAGE_KEY } from './inAppReviewStore.ts';
import { parseLength } from './units.ts';

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => { data.set(key, value); },
  };
}

test('starter shows only to brand-new users', () => {
  const fresh = { hasRecentHistory: false, starterUsed: false, successfulCalcCount: 0 };
  assert.equal(shouldShowHomeStarter(fresh), true);
  assert.equal(shouldShowHomeStarter({ ...fresh, hasRecentHistory: true }), false);
  assert.equal(shouldShowHomeStarter({ ...fresh, starterUsed: true }), false);
  assert.equal(shouldShowHomeStarter({ ...fresh, successfulCalcCount: 1 }), false);
});

test('starter example parses as a valid height in every unit', () => {
  for (const unit of ['fractional', 'decimal', 'metric'] as const) {
    const params = homeStarterOffsetParams(unit);
    assert.equal(params.angle, 30);
    assert.equal(params.unit, unit);
    const inches = parseLength(params.heightText ?? '', unit);
    assert.ok(inches !== null && inches > 5 && inches < 7, `${unit} -> ${inches}`);
  }
});

test('starter state reads its flag and the review calc count, then remembers a tap', async () => {
  const storage = memoryStorage({ [REVIEW_STORAGE_KEY]: JSON.stringify({ firstSeenAt: 1, successfulCalcCount: 2, lastRequestedAt: null }) });
  assert.deepEqual(await loadHomeStarterState(storage), { starterUsed: false, successfulCalcCount: 2 });
  await markHomeStarterUsed(storage);
  assert.equal(storage.data.get(HOME_STARTER_STORAGE_KEY), '1');
  assert.equal((await loadHomeStarterState(storage)).starterUsed, true);
});

test('storage failure hides the starter instead of throwing', async () => {
  const broken = { getItem: async () => { throw new Error('io'); }, setItem: async () => { throw new Error('io'); } };
  assert.equal((await loadHomeStarterState(broken)).starterUsed, true);
  await markHomeStarterUsed(broken);
});
