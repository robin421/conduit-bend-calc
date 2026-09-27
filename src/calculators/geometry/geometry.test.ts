import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { BENDER_SPECS } from '../../constants.ts';
import {
  createCustomSpec,
  defaultBenderSpec,
  displaySpecName,
  findBenderSpec,
  legacySizeToSpec,
  listPresetBrands,
  listPresetConduits,
  listPresetModels,
  resolveSpecKey,
  specKey,
} from './benderSpecs.ts';
import {
  calculateKicked90Geometry,
  calculateOffsetGeometry,
  calculateRollingOffsetGeometry,
  calculateSaddle3Geometry,
  calculateSaddle4Geometry,
  calculateStubUpMark,
  calibrateRadiusFromGain,
  calibrateTakeUp,
  degToRad,
  gain,
  layoutChain,
  validateLayout,
} from './geometry.ts';

const geometrySourcePath = join(
  process.cwd(),
  'src/calculators/geometry/geometry.ts',
);

function approx(actual: number, expected: number, eps = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= eps,
    `期望约 ${expected}，实际 ${actual}`,
  );
}

test('gain: R=4.625、θ=90° → 约 1.985（trade 正值）', () => {
  const result = gain(4.625, Math.PI / 2);
  assert.ok(result !== null);
  assert.ok(Math.abs(result - 1.985) < 0.001, `实际 ${result}`);
});

test('gain: G(θ)=2R·tan(θ/2)−Rθ，G₉₀=0.4292R', () => {
  const r = 5.25;
  const g90 = gain(r, Math.PI / 2);
  assert.ok(g90 !== null);
  approx(g90, r * (2 - Math.PI / 2), 1e-12);
  const g30 = gain(r, Math.PI / 6);
  assert.ok(g30 !== null);
  approx(g30, 2 * r * Math.tan(Math.PI / 12) - r * (Math.PI / 6), 1e-12);
  assert.ok(g30 > 0, 'trade gain 为正值');
});

test('gain: 非法输入返回 null', () => {
  assert.equal(gain(0, Math.PI / 2), null);
  assert.equal(gain(-1, Math.PI / 2), null);
  assert.equal(gain(4.625, 0), null);
  assert.equal(gain(4.625, Math.PI), null);
  assert.equal(gain(4.625, Number.NaN), null);
});

test('offset: H=6、θ=30° → vertexSpacing=12、shrinkDisplay=1.5（D1 trade 显示）', () => {
  const result = calculateOffsetGeometry(6, 30, 4.625);
  assert.ok(result);
  approx(result.vertexSpacing, 12, 1e-9);
  assert.equal(result.spacingDisplay, 12);
  assert.equal(result.shrinkDisplay, 1.5);
});

test('offset: 精确内部值（markSpacing/shrinkExact 供内部料长用）', () => {
  const result = calculateOffsetGeometry(6, 30, 4.625);
  assert.ok(result);
  const g = gain(4.625, Math.PI / 6);
  assert.ok(g !== null);
  approx(result.markSpacing, 12 - g, 1e-9);
  approx(result.shrinkExact, 6 * Math.tan(Math.PI / 12) - 2 * g, 1e-9);
});

test('offset: 非预设角度无表值，显示用精确式', () => {
  const result = calculateOffsetGeometry(10, 20, 4.625);
  assert.ok(result);
  approx(result.spacingDisplay, 10 / Math.sin((20 * Math.PI) / 180), 1e-9);
  approx(result.shrinkDisplay, 10 * Math.tan((10 * Math.PI) / 180), 1e-9);
});

test('offset: 非法输入返回 null', () => {
  assert.equal(calculateOffsetGeometry(0, 30, 4.625), null);
  assert.equal(calculateOffsetGeometry(6, 0, 4.625), null);
  assert.equal(calculateOffsetGeometry(6, 30, -1), null);
});

test('stubUp: H=12 + Klein 51603（take-up 5）→ mark=7', () => {
  const spec = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(spec);
  assert.equal(calculateStubUpMark(12, spec), 7);
});

test('stubUp: 标记点非正或非法输入返回 null', () => {
  const spec = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(spec);
  assert.equal(calculateStubUpMark(4, spec), null);
  assert.equal(calculateStubUpMark(12, { ...spec, takeUp: 0 }), null);
  assert.equal(calculateStubUpMark(-5, spec), null);
});

test('saddle3: 中心 45°、两侧 22.5°，显示 2.5H', () => {
  const result = calculateSaddle3Geometry(6, 4.625);
  assert.ok(result);
  assert.equal(result.centerAngleDeg, 45);
  assert.equal(result.sideAngleDeg, 22.5);
  assert.equal(result.sideSpacingDisplay, 15);
  approx(result.sideSpacingExact, 6 / Math.sin((22.5 * Math.PI) / 180), 1e-9);
  approx(
    result.sideMarkSpacing,
    result.sideSpacingExact - 4.625 * Math.tan((11.25 * Math.PI) / 180),
    1e-9,
  );
  assert.equal(calculateSaddle3Geometry(0, 4.625), null);
});

test('saddle4: 两个 offset + 中间平段', () => {
  const result = calculateSaddle4Geometry(6, 30, 8, 4.625);
  assert.ok(result);
  assert.equal(result.legSpacingDisplay, 12);
  assert.equal(result.totalShrinkDisplay, 3);
  assert.equal(result.flatWidth, 8);
  const g = gain(4.625, Math.PI / 6);
  assert.ok(g !== null);
  approx(result.legMarkSpacing, 12 - g, 1e-9);
  assert.equal(calculateSaddle4Geometry(6, 30, 0, 4.625), null);
});

test('kicked90: 总 gain = G(90°)+G(κ)，κ 参数化', () => {
  const result = calculateKicked90Geometry(15, 10, 4.625);
  assert.ok(result);
  const g90 = gain(4.625, Math.PI / 2);
  const gk = gain(4.625, (15 * Math.PI) / 180);
  assert.ok(g90 !== null && gk !== null);
  approx(result.totalGain, g90 + gk, 1e-12);
  approx(result.tangent90, 4.625, 1e-12);
  approx(result.tangentKick, 4.625 * Math.tan(((15 * Math.PI) / 180) / 2), 1e-12);
  assert.equal(result.straightLength, 10);
  assert.equal(calculateKicked90Geometry(0, 10, 4.625), null);
  assert.equal(calculateKicked90Geometry(90, 10, 4.625), null);
});

test('rollingOffset: rise=6、roll=8、θ=30° → 真实偏移 10、间距 20', () => {
  const result = calculateRollingOffsetGeometry(6, 8, 30, 4.625);
  assert.ok(result);
  assert.equal(result.trueOffset, 10);
  assert.equal(result.spacingDisplay, 20);
  assert.equal(result.shrinkDisplay, 2.5);
  approx(result.rollAngleDeg, (Math.atan2(8, 6) * 180) / Math.PI, 1e-9);
  assert.equal(calculateRollingOffsetGeometry(0, 8, 30, 4.625), null);
});

test('layoutChain: 直段 = D_v − R·tan(θᵢ/2) − R·tan(θᵢ₊₁/2)，总 gain 累加', () => {
  const result = layoutChain(
    [
      { thetaDeg: 30, vertexDistanceToNext: 12 },
      { thetaDeg: 30 },
    ],
    4.625,
  );
  assert.ok(result);
  assert.equal(result.straights.length, 1);
  const expected = 12 - 2 * 4.625 * Math.tan(Math.PI / 12);
  approx(result.straights[0] as number, expected, 1e-9);
  const g = gain(4.625, Math.PI / 6);
  assert.ok(g !== null);
  approx(result.totalGain, 2 * g, 1e-12);
});

test('layoutChain: 非法输入返回 null', () => {
  assert.equal(layoutChain([], 4.625), null);
  assert.equal(
    layoutChain([{ thetaDeg: 30 }, { thetaDeg: 30 }], 4.625),
    null,
  );
});

test('validateLayout: 直段为负 → error「这个弯做不出来」', () => {
  const warnings = validateLayout({ straights: [9.5, -0.2] });
  const error = warnings.find((w) => w.level === 'error');
  assert.ok(error);
  assert.ok(error.message.includes('这个弯做不出来'));
});

test('validateLayout: 正常直段无 error', () => {
  const warnings = validateLayout({ straights: [9.5, 3] });
  assert.ok(!warnings.some((w) => w.level === 'error'));
});

test('validateLayout: stub 低于 min stub → warning（Greenlee 1800 公开值）', () => {
  const spec = findBenderSpec('Greenlee', '1800', '1/2" Rigid');
  assert.ok(spec);
  const warnings = validateLayout({ stubHeightInches: 5, spec });
  assert.ok(warnings.some((w) => w.level === 'warning'));
  const ok = validateLayout({ stubHeightInches: 8, spec });
  assert.ok(!ok.some((w) => w.level === 'warning'));
});

test('validateLayout: 无公开 min stub 的规格不预警（不硬编数据）', () => {
  const spec = findBenderSpec('Ideal', '74-026', '1/2" EMT');
  assert.ok(spec);
  const warnings = validateLayout({ stubHeightInches: 3, spec });
  assert.ok(!warnings.some((w) => w.level === 'warning'));
});

test('validateLayout: 1/2" 管 R<4" → NEC info 提示', () => {
  const spec = findBenderSpec('Greenlee', '1800', '1/2" Rigid');
  assert.ok(spec);
  const warnings = validateLayout({ spec });
  assert.ok(warnings.some((w) => w.level === 'info' && w.message.includes('NEC')));
  const klein = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(klein);
  const ok = validateLayout({ spec: klein });
  assert.ok(!ok.some((w) => w.level === 'info'));
});

test('calibrateRadiusFromGain: L₀=30、A=17、B=14.3 → R≈3.03', () => {
  const r = calibrateRadiusFromGain(30, 17, 14.3);
  assert.ok(r !== null);
  approx(r, 1.3 / (2 - Math.PI / 2), 1e-9);
  assert.ok(Math.abs(r - 3.03) < 0.01, `实际 ${r}`);
});

test('calibrateRadiusFromGain: G<=0 或非法输入返回 null', () => {
  assert.equal(calibrateRadiusFromGain(40, 17, 14.3), null);
  assert.equal(calibrateRadiusFromGain(0, 17, 14.3), null);
});

test('calibrateTakeUp: 旧 5、目标 12、实际 12.4 → 5.4', () => {
  assert.equal(calibrateTakeUp(5, 12, 12.4), 5.4);
  assert.equal(calibrateTakeUp(5, 12, 11), 4);
  assert.equal(calibrateTakeUp(0, 12, 12.4), null);
});

test('benderSpecs: 预设表 14 条，R 与 take-up 配对', () => {
  assert.equal(BENDER_SPECS.length, 14);
  const klein = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(klein);
  assert.equal(klein.centerlineRadius, 4.625);
  assert.equal(klein.takeUp, 5);
  const greenlee = findBenderSpec('Greenlee', '1800', '1/2" Rigid');
  assert.ok(greenlee);
  assert.equal(greenlee.datum, 'hook');
  assert.equal(findBenderSpec('Ideal', '74-026', '9" EMT'), undefined);
});

test('benderSpecs: 品牌/型号/管径列表', () => {
  assert.deepEqual(listPresetBrands(), ['Ideal', 'Klein', 'Greenlee']);
  assert.deepEqual(listPresetModels('Klein'), ['51603', '51604', '51605']);
  assert.deepEqual(listPresetConduits('Greenlee', '1800'), [
    '1/2" Rigid',
    '3/4" Rigid',
    '1" Rigid',
  ]);
});

test('benderSpecs: Custom 规格构造与展示名', () => {
  const custom = createCustomSpec('我的 Klein 51603', 4.7, 5.1);
  assert.ok(custom);
  assert.equal(custom.brand, 'Custom');
  assert.equal(displaySpecName(custom), '我的 Klein 51603');
  const preset = findBenderSpec('Ideal', '74-026', '1/2" EMT');
  assert.ok(preset);
  assert.equal(displaySpecName(preset), 'Ideal 74-026 1/2" EMT');
  assert.equal(createCustomSpec('', 4.7, 5.1), null);
  assert.equal(createCustomSpec('x', -1, 5.1), null);
});

test('specKey/resolveSpecKey: 预设与 Custom 往返', () => {
  const preset = findBenderSpec('Klein', '51603', '1/2" EMT');
  assert.ok(preset);
  assert.equal(specKey(preset), 'Klein|51603|1/2" EMT');
  assert.deepEqual(resolveSpecKey(specKey(preset), []), preset);
  const custom = createCustomSpec('我的 Klein 51603', 4.7, 5.1);
  assert.ok(custom);
  assert.equal(specKey(custom), 'custom|我的 Klein 51603');
  assert.deepEqual(resolveSpecKey(specKey(custom), [custom]), custom);
  assert.equal(resolveSpecKey('custom|不存在', [custom]), undefined);
  assert.equal(resolveSpecKey('badkey', []), undefined);
});

test('defaultBenderSpec: 缺省为 Ideal 74-026（take-up 5，等效老版本 1/2"）', () => {
  const def = defaultBenderSpec();
  assert.equal(def.brand, 'Ideal');
  assert.equal(def.model, '74-026');
  assert.equal(def.takeUp, 5);
});

test('legacySizeToSpec: v1.0.x 规格映射 take-up 一致', () => {
  assert.equal(legacySizeToSpec('1/2').takeUp, 5);
  assert.equal(legacySizeToSpec('3/4').takeUp, 6);
  assert.equal(legacySizeToSpec('1').takeUp, 8);
});

test('degToRad: 非法输入返回 null', () => {
  assert.equal(degToRad(180), Math.PI);
  assert.equal(degToRad(Number.NaN), null);
});

test('spec 未验证公式在源码中标有 ⚠️ 注释', () => {
  const source = readFileSync(geometrySourcePath, 'utf8');
  for (const marker of [
    '⚠️ 推导未验证：切点 mark 距',
    '⚠️ 推导未验证：精确 shrink',
    '⚠️ 推导未验证（spec §9.2）',
    '⚠️ 推导未验证：每段切点 mark 距',
    '对照 QuickBend 文档时必须取反',
  ]) {
    assert.ok(
      source.includes(marker),
      `源码缺少标注：${marker}`,
    );
  }
});
