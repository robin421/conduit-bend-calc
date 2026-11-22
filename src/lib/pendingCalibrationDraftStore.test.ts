import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BenderSpec } from '../constants.ts';
import type { HistoryStorage } from './historyStore.ts';
import { standardProfiles, withCalibration } from './profile.ts';
import {
  PENDING_CALIBRATION_DRAFT_KEY,
  PENDING_CALIBRATION_DRAFT_TTL_MS,
  applyPendingCalibrationDraft,
  computePostCalibrationPopCount,
  computeTakeUpComparison,
  createPendingCalibrationDraftStore,
  deltaBucket,
  formatSignedDelta,
  parsePendingCalibrationDraft,
  type PendingCalibrationDraft,
} from './pendingCalibrationDraftStore.ts';

function createMemoryStorage(): HistoryStorage & { data: Map<string, string>; removedKeys: string[] } {
  const data = new Map<string, string>();
  const removedKeys: string[] = [];
  return {
    data,
    removedKeys,
    async getItem(key: string): Promise<string | null> {
      return data.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      data.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      removedKeys.push(key);
      data.delete(key);
    },
  };
}

const baseProfile = standardProfiles()[0];

function makeGuidedDraft(createdAt: number): PendingCalibrationDraft {
  const profile = withCalibration(baseProfile, {
    name: 'My 1/2" EMT',
    actualDeduct: 5.375,
    bendRadius: 4.971875,
    calibrationDate: createdAt,
  });
  return {
    mode: 'guided',
    baseTakeUp: 5,
    measuredTakeUp: 5.375,
    deltaInches: 0.375,
    profileName: profile.name,
    profile,
    entrySource: 'offset_calibration',
    createdAt,
  };
}

function makeManualDraft(createdAt: number): PendingCalibrationDraft {
  const spec: BenderSpec = {
    brand: 'Custom',
    model: 'custom',
    conduit: '3/4" EMT',
    centerlineRadius: 5.75,
    takeUp: 6.25,
    customName: 'Shop 3/4" Ideal',
  };
  return {
    mode: 'manual',
    baseTakeUp: 6,
    measuredTakeUp: 6.25,
    deltaInches: 0.25,
    profileName: 'Shop 3/4" Ideal',
    spec,
    entrySource: 'full_fingerprint_save',
    createdAt,
  };
}

test('deltaBucket：零偏差与三档阈值精确分桶（支持正负偏差与非有限值兜底）', () => {
  assert.equal(deltaBucket(0), 'zero');
  assert.equal(deltaBucket(-0), 'zero');
  assert.equal(deltaBucket(Number.NaN), 'zero');
  assert.equal(deltaBucket(0.0625), 'small');
  assert.equal(deltaBucket(-0.125), 'small');
  assert.equal(deltaBucket(0.125), 'small');
  assert.equal(deltaBucket(0.1875), 'medium');
  assert.equal(deltaBucket(-0.25), 'medium');
  assert.equal(deltaBucket(0.25), 'medium');
  assert.equal(deltaBucket(0.251), 'large');
  assert.equal(deltaBucket(-0.375), 'large');
  assert.equal(deltaBucket(0.5), 'large');
});

test('formatSignedDelta 与 computeTakeUpComparison：正负偏差、零偏差及超大 take-up 保护', () => {
  assert.equal(formatSignedDelta(0.375, 'fractional'), '+3/8"');
  assert.equal(formatSignedDelta(-0.125, 'fractional'), '−1/8"');
  assert.equal(formatSignedDelta(0, 'fractional'), '0"');
  assert.equal(formatSignedDelta(0, 'metric'), '0 mm');
  assert.equal(formatSignedDelta(0.25, 'decimal'), '+0.25"');

  const normal = computeTakeUpComparison(5, 5.375);
  assert.deepEqual(normal, {
    targetStub: 12,
    standardMark: 7,
    personalMark: 6.625,
    deltaInches: 0.375,
  });

  // 超大 take-up >= 12" 时自动抬升对比目标，不返回 null 或负数标记
  const large = computeTakeUpComparison(11.5, 12.5);
  assert.ok(large);
  assert.equal(large.targetStub, 17);
  assert.equal(large.standardMark, 5.5);
  assert.equal(large.personalMark, 4.5);

  assert.equal(computeTakeUpComparison(0, 5), null);
  assert.equal(computeTakeUpComparison(5, -1), null);
});

test('pendingCalibrationDraftStore：guided 与 manual 草稿写入、缓存与持久化往返', async () => {
  let clock = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const store = createPendingCalibrationDraftStore(storage, () => clock);

  assert.equal(store.getCached(), null);
  assert.equal(await store.load(), null);

  const guided = makeGuidedDraft(clock);
  await store.save(guided);
  assert.deepEqual(store.getCached(), guided);
  assert.deepEqual(await store.load(), guided);
  assert.ok(storage.data.has(PENDING_CALIBRATION_DRAFT_KEY));

  // 冷启动新实例从 AsyncStorage 恢复
  const coldStore = createPendingCalibrationDraftStore(storage, () => clock + 1000);
  assert.equal(coldStore.getCached(), null);
  assert.deepEqual(await coldStore.load(), guided);
  assert.deepEqual(coldStore.getCached(), guided);

  // 覆盖为 manual 草稿并清空
  const manual = makeManualDraft(clock + 2000);
  await store.save(manual);
  assert.deepEqual(await store.load(), manual);
  await store.clear();
  assert.equal(store.getCached(), null);
  assert.equal(await store.load(), null);
  assert.equal(storage.data.has(PENDING_CALIBRATION_DRAFT_KEY), false);
});

test('pendingCalibrationDraftStore：超过 24 小时自动过期清理并返回 null', async () => {
  let clock = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const store = createPendingCalibrationDraftStore(storage, () => clock);

  const draft = makeGuidedDraft(clock);
  await store.save(draft);

  // 恰好 24 小时仍有效
  clock += PENDING_CALIBRATION_DRAFT_TTL_MS;
  assert.deepEqual(await store.load(), draft);

  // 超过 24 小时 1ms 后自动清理
  clock += 1;
  assert.equal(store.getCached(), null);
  assert.equal(await store.load(), null);
  assert.equal(storage.data.has(PENDING_CALIBRATION_DRAFT_KEY), false);
  assert.ok(storage.removedKeys.includes(PENDING_CALIBRATION_DRAFT_KEY));
});

test('pendingCalibrationDraftStore：冷启动读取到已过期或损坏草稿时自动清理不抛异常', async () => {
  let clock = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const expired = makeGuidedDraft(clock - PENDING_CALIBRATION_DRAFT_TTL_MS - 10);
  storage.data.set(PENDING_CALIBRATION_DRAFT_KEY, JSON.stringify(expired));

  const store = createPendingCalibrationDraftStore(storage, () => clock);
  assert.equal(await store.load(), null);
  assert.equal(storage.data.has(PENDING_CALIBRATION_DRAFT_KEY), false);

  // 损坏 JSON 静默返回 null
  storage.data.set(PENDING_CALIBRATION_DRAFT_KEY, '{broken');
  const store2 = createPendingCalibrationDraftStore(storage, () => clock);
  assert.equal(await store2.load(), null);
  assert.equal(parsePendingCalibrationDraft('{"mode":"guided","profileName":""}'), null);
  assert.equal(parsePendingCalibrationDraft('{"mode":"manual","profileName":"x"}'), null);
});

test('applyPendingCalibrationDraft：guided 与 manual 模式自动保存、激活、清草稿并上报埋点', async () => {
  const clock = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const store = createPendingCalibrationDraftStore(storage, () => clock);
  const guided = makeGuidedDraft(clock);
  await store.save(guided);

  const calls: string[] = [];
  const appliedGuided = await applyPendingCalibrationDraft({
    loadDraft: store.load,
    clearDraft: store.clear,
    ensureProfilesLoaded: async () => { calls.push('loadProfiles'); },
    applyGuidedProfile: (p) => { calls.push(`guided:${p.name}`); },
    applyManualSpec: () => { calls.push('unexpectedManual'); },
    trackAutoApplied: (source, mode) => { calls.push(`auto:${source}:${mode}`); },
    trackCalibrated: (source) => { calls.push(`calibrated:${source}`); },
    showToast: (name) => { calls.push(`toast:${name}`); },
  });

  assert.deepEqual(appliedGuided, guided);
  assert.equal(await store.load(), null);
  assert.deepEqual(calls, [
    'loadProfiles',
    'guided:My 1/2" EMT',
    'auto:offset_calibration:guided',
    'calibrated:guided',
    'toast:My 1/2" EMT',
  ]);

  // 无草稿时返回 null 且不触发任何副作用
  const emptyCalls: string[] = [];
  const none = await applyPendingCalibrationDraft({
    loadDraft: store.load,
    clearDraft: store.clear,
    ensureProfilesLoaded: async () => { emptyCalls.push('loadProfiles'); },
    applyGuidedProfile: () => { emptyCalls.push('guided'); },
    applyManualSpec: () => { emptyCalls.push('manual'); },
    trackAutoApplied: () => { emptyCalls.push('auto'); },
    trackCalibrated: () => { emptyCalls.push('calibrated'); },
    showToast: () => { emptyCalls.push('toast'); },
  });
  assert.equal(none, null);
  assert.deepEqual(emptyCalls, []);

  // manual 模式自动保存 custom spec
  const manual = makeManualDraft(clock + 5000);
  await store.save(manual);
  const manualCalls: string[] = [];
  const appliedManual = await applyPendingCalibrationDraft({
    loadDraft: store.load,
    clearDraft: store.clear,
    ensureProfilesLoaded: async () => { manualCalls.push('loadProfiles'); },
    applyGuidedProfile: () => { manualCalls.push('unexpectedGuided'); },
    applyManualSpec: (s, name) => { manualCalls.push(`manual:${s.conduit}:${name}`); },
    trackAutoApplied: (source, mode) => { manualCalls.push(`auto:${source}:${mode}`); },
    trackCalibrated: (source) => { manualCalls.push(`calibrated:${source}`); },
    showToast: (name) => { manualCalls.push(`toast:${name}`); },
  });
  assert.deepEqual(appliedManual, manual);
  assert.equal(await store.load(), null);
  assert.deepEqual(manualCalls, [
    'loadProfiles',
    'manual:3/4" EMT:Shop 3/4" Ideal',
    'auto:full_fingerprint_save:manual',
    'calibrated:manual',
    'toast:Shop 3/4" Ideal',
  ]);
});

test('computePostCalibrationPopCount：跳过校准向导与付费墙，精准退回原计算器或首页', () => {
  assert.equal(
    computePostCalibrationPopCount(['CalcHome', 'Offset', 'GuidedCalibration', 'Paywall'], 3),
    2,
  );
  assert.equal(
    computePostCalibrationPopCount(['CalcHome', 'GuidedCalibration', 'Calibration', 'Paywall'], 3),
    3,
  );
  assert.equal(
    computePostCalibrationPopCount(['CalcHome', 'Bender', 'GuidedCalibration', 'Paywall'], 3),
    2,
  );
  assert.equal(
    computePostCalibrationPopCount(['CalcHome', 'Paywall'], 1),
    1,
  );
  assert.equal(computePostCalibrationPopCount(['Paywall'], 0), null);
});
