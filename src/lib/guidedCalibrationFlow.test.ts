import assert from 'node:assert/strict';
import { test } from 'node:test';

import { standardProfiles } from './profile.ts';
import {
  FIRST_GUIDED_STEP,
  GUIDED_STEPS,
  LAST_GUIDED_STEP,
  MEASURE_STEP,
  TEST_BEND_MARK,
  buildGuidedProfile,
  canAdvanceGuidedStep,
  computeGuidedCalibration,
  guidedStepProgress,
  isGuidedStep,
  nextGuidedStep,
  prevGuidedStep,
} from './guidedCalibrationFlow.ts';

const BASE = standardProfiles()[0];

test('步骤流共 4 步，首末步正确', () => {
  assert.deepEqual([...GUIDED_STEPS], [1, 2, 3, 4]);
  assert.equal(FIRST_GUIDED_STEP, 1);
  assert.equal(LAST_GUIDED_STEP, 4);
  assert.equal(MEASURE_STEP, 3);
  assert.equal(TEST_BEND_MARK, 12);
});

test('isGuidedStep: 仅接受 1..4', () => {
  assert.equal(isGuidedStep(1), true);
  assert.equal(isGuidedStep(4), true);
  assert.equal(isGuidedStep(0), false);
  assert.equal(isGuidedStep(5), false);
  assert.equal(isGuidedStep(2.5), false);
});

test('nextGuidedStep / prevGuidedStep: 边界钳制', () => {
  assert.equal(nextGuidedStep(1), 2);
  assert.equal(nextGuidedStep(3), 4);
  assert.equal(nextGuidedStep(4), 4);
  assert.equal(prevGuidedStep(4), 3);
  assert.equal(prevGuidedStep(1), 1);
});

test('guidedStepProgress: 1-based 进度', () => {
  assert.deepEqual(guidedStepProgress(1), { current: 1, total: 4 });
  assert.deepEqual(guidedStepProgress(3), { current: 3, total: 4 });
  assert.deepEqual(guidedStepProgress(4), { current: 4, total: 4 });
});

test('computeGuidedCalibration: S=17 3/8" → deduct 5 3/8"，且不暴露 take-up', () => {
  const result = computeGuidedCalibration(17.375, BASE);
  assert.ok(result);
  assert.equal(result.measuredStubInches, 17.375);
  assert.equal(result.actualDeduct, 5.375);
  assert.ok(Math.abs(result.estimatedRadius - BASE.bendRadius * (5.375 / (BASE.nominalDeduct ?? BASE.takeUp))) < 1e-9);
});

test('computeGuidedCalibration: 空值 / S<=12 / 非法输入返回 null', () => {
  assert.equal(computeGuidedCalibration(null, BASE), null);
  assert.equal(computeGuidedCalibration(12, BASE), null);
  assert.equal(computeGuidedCalibration(11, BASE), null);
  assert.equal(computeGuidedCalibration(Number.NaN, BASE), null);
});

test('canAdvanceGuidedStep: Step1/2 可前进，Step3 需有效实测值，Step4 不可', () => {
  assert.equal(canAdvanceGuidedStep(1, null, BASE), true);
  assert.equal(canAdvanceGuidedStep(2, null, BASE), true);
  assert.equal(canAdvanceGuidedStep(3, null, BASE), false);
  assert.equal(canAdvanceGuidedStep(3, 12, BASE), false);
  assert.equal(canAdvanceGuidedStep(3, 17.375, BASE), true);
  assert.equal(canAdvanceGuidedStep(4, 17.375, BASE), false);
});

test('buildGuidedProfile: 组装 calibrated 档案，R/take-up 写入但不展示', () => {
  const result = computeGuidedCalibration(17.375, BASE);
  const profile = buildGuidedProfile(BASE, '  My Klein  ', result, 1234);
  assert.ok(profile);
  assert.equal(profile.name, 'My Klein');
  assert.equal(profile.source, 'calibrated');
  assert.equal(profile.actualDeduct, 5.375);
  assert.equal(profile.takeUp, 5.375);
  assert.equal(profile.calibrationDate, 1234);
  assert.equal(profile.bendRadius, result?.estimatedRadius);
});

test('buildGuidedProfile: 空名称或缺失结果返回 null', () => {
  const result = computeGuidedCalibration(17.375, BASE);
  assert.equal(buildGuidedProfile(BASE, '   ', result, 1), null);
  assert.equal(buildGuidedProfile(BASE, 'ok', null, 1), null);
});
