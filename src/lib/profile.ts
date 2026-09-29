/**
 * BenderProfile：多档案数据模型（P0-2）。
 *
 * 设计：BenderSpec 仍是计算引擎的输入单位（R + take-up 配对，D2），
 * BenderProfile 是持久化的用户档案层，profileToSpec() 负责桥接。
 *
 * deduct 语义（产品决策 1）：nominalDeduct / actualDeduct = 90° stub-up 的
 * deduct（bender 上标注的数 / 实测值），对 90° stub 与 arrow take-up 数值一致。
 * 旧单规格数据迁移为 source:'custom' 的 "My Bender (migrated)"，takeUp 原样保留、
 * deduct 置空（未校准）。
 *
 * 纯 TypeScript（仅依赖 constants / benderSpecs 纯函数），可被 node --test 直接 import。
 */

import { BENDER_SPECS, GAIN_90_FACTOR } from '../constants.ts';
import type { BenderBrand, BenderSpec } from '../constants.ts';
import { specKey } from '../calculators/geometry/benderSpecs.ts';

export type ProfileSource = 'standard' | 'custom' | 'calibrated';

export interface BenderProfile {
  /** 唯一 ID。standard 为 `standard|<specKey>`，用户档案为 `custom|<name>`。 */
  id: string;
  /** 展示名，如 `My Klein 3/4" EMT`。 */
  name: string;
  brand: BenderBrand;
  model: string;
  /** 导体类型，如 'EMT' / 'Rigid' / 'IMC' / 'PVC'。 */
  conduitType: string;
  /** 导体规格，如 '1/2"' / '3/4"'。 */
  conduitSize: string;
  /** 90° stub-up 标称 deduct（英寸）；无标注时为 null。 */
  nominalDeduct: number | null;
  /** 实测 90° stub-up deduct（英寸）；未校准为 null。 */
  actualDeduct: number | null;
  /** 中心线半径 R（英寸）。校准后为估计的实际 R。 */
  bendRadius: number;
  /** 90° gain（英寸）= R·(2−π/2)；可算时为数值。 */
  gain: number | null;
  /** Expected→Actual 累积校正量（英寸，加到主测量值上）。 */
  calibrationOffset: number;
  /** 最近一次校准时间（毫秒）；未校准为 null。 */
  calibrationDate: number | null;
  source: ProfileSource;
  /** 90° stub take-up（英寸，计算引擎用）。calibrated 时 = actualDeduct。 */
  takeUp: number;
  datum: 'arrow' | 'hook';
}

/** 解析 `1/2" EMT` / `1-1/4" Rigid` 为规格 + 类型。 */
export function parseConduitLabel(conduit: string): {
  conduitSize: string;
  conduitType: string;
} {
  const match = conduit.trim().match(/^(.*?")\s*(.*)$/);
  if (!match) {
    return { conduitSize: conduit.trim(), conduitType: '' };
  }
  return {
    conduitSize: (match[1] ?? '').trim(),
    conduitType: (match[2] ?? '').trim(),
  };
}

/** 档案对应的计算引擎规格键，用于历史回填 / 选中匹配。 */
export function profileSpecKey(profile: BenderProfile): string {
  return specKey(profileToSpec(profile));
}

export function standardProfileId(spec: BenderSpec): string {
  return `standard|${specKey(spec)}`;
}

function standardSourceProtocol(): 'arrow' | 'hook' {
  return 'arrow';
}

/**
 * BenderSpec → BenderProfile。standard 档案保留原品牌/型号/datum；
 * custom / calibrated 档案品牌记为 Custom、名称作为 customName。
 */
export function specToProfile(
  spec: BenderSpec,
  options: {
    source?: ProfileSource;
    id?: string;
    name?: string;
    nominalDeduct?: number | null;
    actualDeduct?: number | null;
    calibrationOffset?: number;
    calibrationDate?: number | null;
  } = {},
): BenderProfile {
  const source = options.source ?? 'custom';
  const { conduitSize, conduitType } = parseConduitLabel(spec.conduit);
  const name = options.name ?? spec.customName ?? spec.conduit;
  return {
    id: options.id ?? standardProfileId(spec),
    name,
    brand: spec.brand,
    model: spec.model,
    conduitType,
    conduitSize,
    nominalDeduct:
      options.nominalDeduct !== undefined ? options.nominalDeduct : spec.takeUp,
    actualDeduct: options.actualDeduct ?? null,
    bendRadius: spec.centerlineRadius,
    gain: spec.centerlineRadius * GAIN_90_FACTOR,
    calibrationOffset: options.calibrationOffset ?? 0,
    calibrationDate: options.calibrationDate ?? null,
    source,
    takeUp: spec.takeUp,
    datum: spec.datum ?? standardSourceProtocol(),
  };
}

/** BenderProfile → BenderSpec（计算引擎输入）。 */
export function profileToSpec(profile: BenderProfile): BenderSpec {
  const isStandard = profile.source === 'standard';
  const conduit = `${profile.conduitSize} ${profile.conduitType}`.trim();
  return {
    brand: isStandard ? profile.brand : 'Custom',
    model: isStandard ? profile.model : 'custom',
    conduit: conduit || profile.name,
    centerlineRadius: profile.bendRadius,
    takeUp: profile.takeUp,
    datum: isStandard ? profile.datum : 'arrow',
    customName: isStandard ? undefined : profile.name,
  };
}

/** 内置 Standard 预设档案（Free 可用）。 */
export function standardProfiles(): BenderProfile[] {
  return BENDER_SPECS.map((spec) =>
    specToProfile(spec, { source: 'standard' }),
  );
}

/** 展示名：standard 用 `品牌 型号 管径`，用户档案用自定义名。 */
export function displayProfileName(profile: BenderProfile): string {
  return profile.name;
}

/** 是否已校准档案。 */
export function isCalibratedProfile(profile: BenderProfile): boolean {
  return profile.source === 'calibrated';
}

/** 主测量值应用累积校正量。 */
export function applyCalibrationOffset(inches: number, profile: BenderProfile | null): number {
  if (!profile || !Number.isFinite(profile.calibrationOffset)) {
    return inches;
  }
  return inches + profile.calibrationOffset;
}

/** 按 specKey 查找档案。 */
export function findProfileBySpecKey(
  profiles: readonly BenderProfile[],
  key: string,
): BenderProfile | undefined {
  return profiles.find((profile) => profileSpecKey(profile) === key);
}

/**
 * 用 Guided Calibration 反推结果组装一个 calibrated 档案。
 * `actualDeduct` → takeUp / nominalDeduct，`bendRadius` 为估计实际 R。
 */
export function withCalibration(
  base: BenderProfile,
  result: {
    name: string;
    actualDeduct: number;
    bendRadius: number;
    calibrationDate: number;
  },
): BenderProfile {
  return {
    ...base,
    id: `custom|${result.name}`,
    name: result.name,
    source: 'calibrated',
    brand: base.brand,
    model: base.model,
    nominalDeduct: base.nominalDeduct ?? base.takeUp,
    actualDeduct: result.actualDeduct,
    bendRadius: result.bendRadius,
    gain: result.bendRadius * GAIN_90_FACTOR,
    calibrationOffset: base.calibrationOffset,
    calibrationDate: result.calibrationDate,
    takeUp: result.actualDeduct,
    datum: 'arrow',
  };
}

/** 更新累积校正量（P0-4），保留其余字段。 */
export function withCalibrationOffset(
  profile: BenderProfile,
  calibrationOffset: number,
  now: number,
): BenderProfile {
  return {
    ...profile,
    calibrationOffset,
    calibrationDate: now,
  };
}

/**
 * 旧数据一次性迁移（产品决策 1）：
 * - `@cbc:bender-spec-v1` 单规格 → 一条 source:'custom' 的 "My Bender (migrated)"，
 *   takeUp 原样保留、deduct 置空。
 * - 旧 customSpecs 列表 → 各一条 source:'custom'，名称取 customName。
 * 名称去重（先到先得）。
 */
export function migrateLegacyProfiles(
  legacySpec: BenderSpec | null,
  customSpecs: readonly BenderSpec[],
): BenderProfile[] {
  const out: BenderProfile[] = [];
  const seen = new Set<string>();
  const push = (profile: BenderProfile) => {
    if (seen.has(profile.name)) {
      return;
    }
    seen.add(profile.name);
    out.push(profile);
  };

  if (legacySpec) {
    push(
      specToProfile(legacySpec, {
        source: 'custom',
        id: 'custom|My Bender (migrated)',
        name: 'My Bender (migrated)',
        nominalDeduct: null,
        actualDeduct: null,
      }),
    );
  }
  for (const spec of customSpecs) {
    const name = spec.customName ?? spec.conduit;
    push(
      specToProfile(spec, {
        source: 'custom',
        id: `custom|${name}`,
        name,
        nominalDeduct: null,
        actualDeduct: null,
      }),
    );
  }
  return out;
}
