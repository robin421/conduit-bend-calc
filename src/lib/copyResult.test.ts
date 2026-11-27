import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildConduitFillCopyText,
  buildKicked90CopyText,
  buildOffsetCopyText,
  buildRollingOffsetCopyText,
  buildSaddleCopyText,
  buildShrinkCopyText,
  buildStubCopyText,
  buildThreePointSaddleCopyText,
  buildVoltageDropCopyText,
  buildWireSizeCopyText,
} from './copyResult.ts';

test('offset：包含间距 / shrink / 两个 mark 位置', () => {
  const text = buildOffsetCopyText({
    angle: 30,
    spacing: 12,
    shrink: 1.5,
    mark1: 0,
    mark2: 12,
    unit: 'fractional',
  });
  assert.equal(
    text,
    'Offset at 30°: mark spacing 1\', shrink 1-1/2". Mark 1 at 0", mark 2 at 1\'.',
  );
});

test('offset：没有起点时只给 mark 1', () => {
  const text = buildOffsetCopyText({
    angle: 45,
    spacing: 8.4,
    shrink: 2.25,
    mark1: 0,
    mark2: null,
    unit: 'decimal',
  });
  assert.equal(text, 'Offset at 45°: mark spacing 8.4", shrink 2.25". Mark 1 at 0".');
});

test('offset：metric 单位输出 mm', () => {
  const text = buildOffsetCopyText({
    angle: 30,
    spacing: 12,
    shrink: 1.5,
    mark1: 0,
    mark2: 12,
    unit: 'metric',
  });
  assert.match(text, /304\.8 mm/);
  assert.match(text, /38\.1 mm/);
});

test('saddle：包含 span 与 total shrink', () => {
  const text = buildSaddleCopyText({
    angle: 30,
    markSpacing: 8,
    span: 20,
    totalShrink: 2,
    unit: 'decimal',
  });
  assert.equal(
    text,
    '4-point saddle at 30°: mark spacing 8", total span 20", total shrink 2".',
  );
});

test('shrink：区分 offset 与 saddle 文案', () => {
  assert.equal(
    buildShrinkCopyText({ mode: 'offset', angle: 30, shrink: 1.5, unit: 'decimal' }),
    'offset shrink at 30°: 1.5".',
  );
  assert.equal(
    buildShrinkCopyText({ mode: 'saddle', angle: 30, shrink: 3, unit: 'decimal' }),
    '4-point saddle shrink at 30°: 3".',
  );
});

test('offset：App 计算器不给起点时只输出间距与 shrink', () => {
  assert.equal(
    buildOffsetCopyText({ angle: 30, spacing: 10, shrink: 1.5, mark1: null, mark2: null, unit: 'fractional' }),
    'Offset at 30°: mark spacing 10", shrink 1-1/2".',
  );
});

test('stub：metric 模式下 take-up 也按毫米输出', () => {
  const text = buildStubCopyText({ sizeLabel: '1/2" EMT', takeUp: 5, mark: 7, unit: 'metric' });
  assert.ok(!text.includes('5"'), text);
  assert.ok(text.includes('127'), text);
});

test('stub：包含 mark 位置与 take-up', () => {
  const text = buildStubCopyText({
    sizeLabel: '1/2" EMT',
    takeUp: 5,
    mark: 7,
    unit: 'fractional',
  });
  assert.equal(
    text,
    '90° stub in 1/2" EMT: mark the conduit at 7" from the end (5" take-up).',
  );
});

test('3-point saddle：包含中心/侧角、侧间距、总跨度与中心 shrink', () => {
  const text = buildThreePointSaddleCopyText({
    centerAngle: 45,
    sideSpacing: 10,
    span: 20,
    shrink: 0.75,
    unit: 'decimal',
  });
  assert.equal(
    text,
    '3-point saddle (45° center / 22.5° sides): side marks 10" from center, total span 20", center shrink 0.75".',
  );
});

test('conduit fill：输出最大根数与可选超载状态', () => {
  const base = buildConduitFillCopyText({
    racewayLabel: 'EMT',
    tradeSize: '3/4',
    wireLabel: '12 AWG',
    maxConductors: 16,
  });
  assert.equal(base, 'NEC Conduit Fill (3/4" EMT, 12 AWG THHN): max 16 wires.');

  const over = buildConduitFillCopyText({
    racewayLabel: 'EMT',
    tradeSize: '1/2',
    wireLabel: '12 AWG',
    maxConductors: 9,
    count: 10,
    fillPercent: 43.75,
    allowedPercent: 40,
    fits: false,
  });
  assert.equal(
    over,
    'NEC Conduit Fill (1/2" EMT, 12 AWG THHN): max 9 wires. 10 wires = 43.8% fill (limit 40%, OVERFILLED).',
  );
});

test('rolling offset：包含 mark spacing / true offset / shrink / rotation', () => {
  const text = buildRollingOffsetCopyText({
    angle: 30,
    trueOffset: 10,
    spacing: 20,
    shrink: 2.5,
    rollAngleDeg: 53.13,
    unit: 'decimal',
  });
  assert.equal(
    text,
    'Rolling offset at 30°: mark spacing 20", true offset 10", shrink 2.5", rotation 53.1°.',
  );
});

test('kicked 90：包含 kick mark / stub mark / take-up / total gain', () => {
  const text = buildKicked90CopyText({
    sizeLabel: '1/2" EMT',
    stubMark: 7,
    takeUp: 5,
    kickAngle: 30,
    kickMarkFromBack: 8,
    totalGain: 2.1,
    unit: 'decimal',
  });
  assert.equal(
    text,
    'Kicked 90° in 1/2" EMT (30° kick): kick mark 8" from back of 90°, stub mark 7" from end (5" take-up), total gain 2.1".',
  );
});

test('wire size：包含电流、连续负载说明、材质、温度列与最小线径', () => {
  const text = buildWireSizeCopyText({
    metalLabel: 'Copper',
    wireLabel: '12 AWG',
    amps: 16,
    requiredAmps: 20,
    continuous: true,
    column: 60,
    ampacity: 20,
  });
  assert.equal(
    text,
    'NEC Wire Size (16 A (×125% = 20 A), Copper, 60°C): minimum 12 AWG (20 A ampacity per Table 310.16).',
  );
});

test('voltage drop：包含达标与超限建议升级线径', () => {
  const ok = buildVoltageDropCopyText({
    phase: 1,
    volts: 120,
    amps: 15,
    distance: 50,
    distanceUnit: 'ft',
    metalLabel: 'Copper',
    wireLabel: '12 AWG',
    dropPercent: 2.48,
    dropVolts: 2.97,
    endVolts: 117.0,
    limitPercent: 3,
  });
  assert.equal(
    ok,
    'NEC Voltage Drop (1φ 120V, 15 A, 50 ft, 12 AWG Copper): 2.48% (2.97 V drop, 117.0 V at load) — OK (≤3%).',
  );

  const over = buildVoltageDropCopyText({
    phase: 3,
    volts: 208,
    amps: 40,
    distance: 200,
    distanceUnit: 'ft',
    metalLabel: 'Copper',
    wireLabel: '8 AWG',
    dropPercent: 5.18,
    dropVolts: 10.78,
    endVolts: 197.2,
    limitPercent: 3,
    recommendedWire: '4 AWG',
  });
  assert.equal(
    over,
    'NEC Voltage Drop (3φ 208V, 40 A, 200 ft, 8 AWG Copper): 5.18% (10.78 V drop, 197.2 V at load) — OVER 3% limit (use 4 AWG).',
  );
});
