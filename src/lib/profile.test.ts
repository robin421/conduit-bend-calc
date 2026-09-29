import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BENDER_SPECS } from '../constants.ts';
import { findBenderSpec } from '../calculators/geometry/benderSpecs.ts';
import {
  applyCalibrationOffset,
  migrateLegacyProfiles,
  parseConduitLabel,
  profileToSpec,
  profileSpecKey,
  specToProfile,
  standardProfileId,
  standardProfiles,
  withCalibration,
  withCalibrationOffset,
} from './profile.ts';

test('parseConduitLabel: 规格 + 类型', () => {
  assert.deepEqual(parseConduitLabel('1/2" EMT'), { conduitSize: '1/2"', conduitType: 'EMT' });
  assert.deepEqual(parseConduitLabel('1-1/4" Rigid'), {
    conduitSize: '1-1/4"',
    conduitType: 'Rigid',
  });
});

test('standardProfiles: 覆盖全部预设，source=standard', () => {
  const profiles = standardProfiles();
  assert.equal(profiles.length, BENDER_SPECS.length);
  for (const profile of profiles) {
    assert.equal(profile.source, 'standard');
    assert.ok(profile.bendRadius > 0);
    assert.ok(profile.gain !== null && profile.gain > 0);
  }
});

test('profileToSpec: standard 档案往返一致（关键字段）', () => {
  const spec = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(spec);
  const profile = specToProfile(spec, { source: 'standard' });
  const roundTrip = profileToSpec(profile);
  assert.equal(roundTrip.brand, 'Klein');
  assert.equal(roundTrip.model, '51603');
  assert.equal(roundTrip.conduit, '1/2" EMT');
  assert.equal(roundTrip.centerlineRadius, spec.centerlineRadius);
  assert.equal(roundTrip.takeUp, spec.takeUp);
  assert.equal(profileSpecKey(profile), 'Klein|51603|1/2" EMT');
});

test('profileToSpec: 非 standard 档案转为 Custom 规格', () => {
  const profile = withCalibration(
    specToProfile(BENDER_SPECS[0], { source: 'standard' }),
    { name: 'My Klein', actualDeduct: 5.4, bendRadius: 4.9, calibrationDate: 123 },
  );
  const spec = profileToSpec(profile);
  assert.equal(spec.brand, 'Custom');
  assert.equal(spec.customName, 'My Klein');
  assert.equal(spec.centerlineRadius, 4.9);
  assert.equal(spec.takeUp, 5.4);
  assert.equal(profileSpecKey(profile), 'custom|My Klein');
});

test('withCalibration: actualDeduct 写入 takeUp，source=calibrated', () => {
  const base = specToProfile(BENDER_SPECS[0], { source: 'standard' });
  const calibrated = withCalibration(base, {
    name: 'My Bender',
    actualDeduct: 5.375,
    bendRadius: 4.5,
    calibrationDate: 1000,
  });
  assert.equal(calibrated.source, 'calibrated');
  assert.equal(calibrated.takeUp, 5.375);
  assert.equal(calibrated.actualDeduct, 5.375);
  assert.equal(calibrated.bendRadius, 4.5);
  assert.equal(calibrated.calibrationDate, 1000);
  assert.equal(calibrated.name, 'My Bender');
});

test('applyCalibrationOffset: 无档案/零偏移不变', () => {
  const base = specToProfile(BENDER_SPECS[0], { source: 'standard' });
  assert.equal(applyCalibrationOffset(12, null), 12);
  assert.equal(applyCalibrationOffset(12, base), 12);
  const adjusted = withCalibrationOffset(base, 0.25, 1);
  assert.equal(applyCalibrationOffset(12, adjusted), 12.25);
});

test('migrateLegacyProfiles: 旧单规格 → My Bender (migrated)，takeUp 保留 deduct 置空', () => {
  const legacy = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(legacy);
  const profiles = migrateLegacyProfiles(legacy, []);
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0]?.name, 'My Bender (migrated)');
  assert.equal(profiles[0]?.source, 'custom');
  assert.equal(profiles[0]?.takeUp, legacy.takeUp);
  assert.equal(profiles[0]?.nominalDeduct, null);
  assert.equal(profiles[0]?.actualDeduct, null);
});

test('migrateLegacyProfiles: 旧 customSpecs 迁移且名称去重', () => {
  const legacy = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(legacy);
  const custom = {
    brand: 'Custom' as const,
    model: 'custom',
    conduit: '1/2" EMT',
    centerlineRadius: 4.7,
    takeUp: 5.1,
    customName: 'My Bender (migrated)',
  };
  const profiles = migrateLegacyProfiles(legacy, [custom, { ...custom, customName: 'Shop bender' }]);
  assert.equal(profiles.length, 2);
  assert.deepEqual(
    profiles.map((p) => p.name),
    ['My Bender (migrated)', 'Shop bender'],
  );
});

test('standardProfileId: 稳定键', () => {
  const spec = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(spec);
  assert.equal(standardProfileId(spec), 'standard|Klein|51603|1/2" EMT');
});
