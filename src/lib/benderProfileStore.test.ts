import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BENDER_SPECS } from '../constants.ts';
import type { BenderSpec } from '../constants.ts';
import { findBenderSpec } from '../calculators/geometry/benderSpecs.ts';
import {
  allProfiles,
  isValidProfile,
  LEGACY_SPEC_STORAGE_KEY,
  loadMigratedState,
  parseProfileState,
  serializeProfileState,
  type ProfileState,
} from './benderProfileStore.ts';
import { specToProfile } from './profile.ts';
import type { HistoryStorage } from './historyStore.ts';

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

const customProfile = specToProfile(
  {
    brand: 'Custom',
    model: 'custom',
    conduit: '3/4" EMT',
    centerlineRadius: 5.6,
    takeUp: 6.2,
    customName: 'Shop bender',
  },
  { source: 'custom', name: 'Shop bender' },
);

test('parseProfileState: 空/损坏返回 null', () => {
  assert.equal(parseProfileState(null), null);
  assert.equal(parseProfileState('not json'), null);
  assert.equal(parseProfileState('{"version":2}'), null);
  assert.equal(parseProfileState('{"version":1,"userProfiles":[]}'), null);
});

test('parseProfileState: 合法往返，剔除非法档案', () => {
  const state: ProfileState = { version: 1, userProfiles: [customProfile], activeId: customProfile.id };
  const parsed = parseProfileState(serializeProfileState(state));
  assert.ok(parsed);
  assert.equal(parsed?.userProfiles.length, 1);
  assert.equal(parsed?.activeId, customProfile.id);

  const withBad = parseProfileState(
    JSON.stringify({ version: 1, userProfiles: [customProfile, { x: 1 }], activeId: 'x' }),
  );
  assert.equal(withBad?.userProfiles.length, 1);
});

test('isValidProfile: 基本校验', () => {
  assert.equal(isValidProfile(customProfile), true);
  assert.equal(isValidProfile({ ...customProfile, bendRadius: -1 }), false);
  assert.equal(isValidProfile({ ...customProfile, source: 'standard' }), false);
});

test('allProfiles: 内置 Standard + 用户档案', () => {
  const combined = allProfiles([customProfile]);
  assert.equal(combined.length, BENDER_SPECS.length + 1);
  assert.equal(combined[0]?.source, 'standard');
  assert.equal(combined[combined.length - 1]?.name, 'Shop bender');
});

test('loadMigratedState: 无旧数据返回 null', async () => {
  assert.equal(await loadMigratedState(createMemoryStorage()), null);
});

test('loadMigratedState: 旧单规格迁移为 custom 档案', async () => {
  const storage = createMemoryStorage();
  const legacy: BenderSpec = {
    brand: 'Klein',
    model: '51603',
    conduit: '1/2" EMT',
    centerlineRadius: 4.625,
    takeUp: 5,
  };
  storage.data.set(LEGACY_SPEC_STORAGE_KEY, JSON.stringify(legacy));
  const migrated = await loadMigratedState(storage);
  assert.ok(migrated);
  assert.equal(migrated?.userProfiles.length, 1);
  assert.equal(migrated?.userProfiles[0]?.name, 'My Bender (migrated)');
  assert.equal(migrated?.activeId, migrated?.userProfiles[0]?.id);
});
