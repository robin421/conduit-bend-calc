/**
 * Feasibility Engine（P0-5）：每次计算除 measurement 外跑可行性检查。
 *
 * 复用 geometry.layoutChain（切点到切点直段 + gain），补足现有 validateLayout
 * 的缺口：总料长 / 剩余直段 / 极端 geometry / bender 能力，输出三态
 * ✓ feasible / ⚠ tight / ✕ impossible 与替代方案。
 *
 * 纯 TypeScript（仅依赖 constants / geometry / benderSpecs 纯函数），可被
 * node --test 直接 import。
 */

import {
  MIN_STUB_TABLE,
  RADIANS_PER_DEGREE,
} from '../../constants.ts';
import type { BenderSpec, OffsetAngle } from '../../constants.ts';
import { layoutChain } from '../geometry/geometry.ts';
import type { BendNode } from '../geometry/geometry.ts';
import { OFFSET_ANGLES } from '../../constants.ts';
import { formatLength } from '../../lib/units.ts';
import type { UnitSystem } from '../../lib/units.ts';

export type FeasibilityStatus = 'feasible' | 'tight' | 'impossible';

/** 操作余量（英寸）：产品决策 4，minimum conduit = 展开总长 + 2"。 */
export const OPERATION_MARGIN_INCHES = 2;

/** 两弯之间直段低于该值视为 Tight（英寸）。 */
export const TIGHT_STRAIGHT_INCHES = 2;

export interface FeasibilityResult {
  status: FeasibilityStatus;
  /** 风险说明（可为空，表示状态良好）。 */
  messages: string[];
  /** 替代方案文案（如换角度）。 */
  suggestions: string[];
  /** 最小需要管长 = 展开总长 + 2"（决策 4）；无法确定时为 null。 */
  minimumConduitInches: number | null;
  /** 剩余最小直段（英寸）；无直段为 null。 */
  remainingStraightInches: number | null;
  /** 建议的更小角度（offset 类）；无建议为 null。 */
  alternateAngleDeg: number | null;
}

export interface FeasibilityInput {
  /** 依次的弯（θ + 到下一弯顶点距），与 warnings.ts 一致。 */
  bends: readonly BendNode[];
  /** 所选 bender 的中心线半径。 */
  radius: number;
  /** 沿管展开长（英寸）；缺省由 bends + radius 推导。 */
  developedLengthInches?: number;
  /** 标准料长（英寸）；给出时做整根管长校核。 */
  conduitLengthInches?: number;
  stubHeightInches?: number | null;
  spec?: BenderSpec | null;
  /** offset 类角度，用于替代角度建议。 */
  angleDeg?: OffsetAngle;
  /** 显示单位；缺省 fractional。纯显示层，不影响计算。 */
  unit?: UnitSystem;
}

/** 展开长 = Σ直段 + Σ弧长（R·θ）；非法时返回 null。 */
export function developedLengthFromBends(
  bends: readonly BendNode[],
  radius: number,
): number | null {
  const layout = layoutChain(bends, radius);
  if (!layout) {
    return null;
  }
  let developed = 0;
  for (const straight of layout.straights) {
    if (!Number.isFinite(straight)) {
      return null;
    }
    developed += straight;
  }
  for (const bend of bends) {
    developed += radius * bend.thetaDeg * RADIANS_PER_DEGREE;
  }
  return developed;
}

function minStubFor(spec: BenderSpec): number | null {
  const entry = MIN_STUB_TABLE.find(
    (row) =>
      row.brand === spec.brand &&
      row.model === spec.model &&
      row.conduit === spec.conduit,
  );
  return entry ? entry.minStubInches : null;
}

/**
 * 可行性评估核心。
 * - 任一直段 < 0 → impossible（两弯重叠）
 * - 0 ≤ 直段 < 2" → tight
 * - stub 低于 bender 最小 stub → impossible
 * - 给出料长时：展开长 > 料长 → impossible；余量 < 2" → tight
 * 替代方案：更小的预设角度 / 最小管长。
 */
export function evaluateFeasibility(input: FeasibilityInput): FeasibilityResult {
  const messages: string[] = [];
  const suggestions: string[] = [];
  let status: FeasibilityStatus = 'feasible';
  const unit: UnitSystem = input.unit ?? 'fractional';

  const layout = layoutChain(input.bends, input.radius);
  const straights = layout?.straights ?? [];
  let remainingStraightInches: number | null = null;
  if (straights.length > 0) {
    const minStraight = Math.min(...straights);
    remainingStraightInches = minStraight;
    if (minStraight < 0) {
      status = 'impossible';
      messages.push(
        'Bend marks overlap — these bends cannot be made on one piece.',
      );
    } else if (minStraight < TIGHT_STRAIGHT_INCHES) {
      status = 'tight';
      messages.push('Tight bend — very little straight between the bends.');
    }
  }

  const spec = input.spec ?? null;
  const stubHeight = input.stubHeightInches ?? null;
  if (spec && stubHeight !== null && Number.isFinite(stubHeight)) {
    const minStub = minStubFor(spec);
    if (minStub !== null && stubHeight < minStub) {
      status = 'impossible';
      messages.push(
        `Below this bender's minimum stub (${formatLength(minStub, unit)}).`,
      );
    }
  }

  const developed =
    input.developedLengthInches ??
    developedLengthFromBends(input.bends, input.radius) ??
    null;
  const minimumConduitInches = developed !== null ? developed + OPERATION_MARGIN_INCHES : null;

  if (input.conduitLengthInches !== undefined && developed !== null) {
    if (developed > input.conduitLengthInches) {
      status = 'impossible';
      messages.push('Not enough conduit for this bend sequence.');
    } else if (input.conduitLengthInches - developed < OPERATION_MARGIN_INCHES) {
      if (status === 'feasible') {
        status = 'tight';
      }
      messages.push('Barely enough conduit — almost no working margin left.');
    }
  }

  // 替代角度：offset 类且状态非 feasible 时，建议更小的预设角。
  let alternateAngleDeg: number | null = null;
  if (status !== 'feasible' && input.angleDeg !== undefined) {
    const lower = [...OFFSET_ANGLES]
      .filter((angle) => angle < input.angleDeg!)
      .pop();
    if (lower !== undefined) {
      alternateAngleDeg = lower;
      suggestions.push(
        `Try ${lower}° instead of ${input.angleDeg}° — it needs less offset spacing.`,
      );
    }
  }
  if (minimumConduitInches !== null && status !== 'feasible') {
    suggestions.push(
      `Minimum conduit required: ${formatLength(minimumConduitInches, unit)}.`,
    );
  }

  if (status === 'feasible' && messages.length === 0) {
    messages.push('Bend is feasible.');
  }

  return {
    status,
    messages,
    suggestions,
    minimumConduitInches,
    remainingStraightInches,
    alternateAngleDeg,
  };
}

/* ---------- 各弯法便捷封装（复用 warnings.ts 的节点构造） ---------- */

/** Offset / Rolling Offset：两弯 θ，顶点距为 H·cscθ。 */
export function offsetFeasibility(
  vertexSpacingInches: number,
  angle: OffsetAngle,
  spec: BenderSpec,
  unit?: UnitSystem,
): FeasibilityResult {
  return evaluateFeasibility({
    bends: [
      { thetaDeg: angle, vertexDistanceToNext: vertexSpacingInches },
      { thetaDeg: angle },
    ],
    radius: spec.centerlineRadius,
    spec,
    angleDeg: angle,
    unit,
  });
}

/** 3-point saddle：两侧弯 θ/2、中心弯 θ。 */
export function threePointSaddleFeasibility(
  centerToSideInches: number,
  angle: OffsetAngle,
  spec: BenderSpec,
  unit?: UnitSystem,
): FeasibilityResult {
  const sideAngle = angle / 2;
  return evaluateFeasibility({
    bends: [
      { thetaDeg: sideAngle, vertexDistanceToNext: centerToSideInches },
      { thetaDeg: angle, vertexDistanceToNext: centerToSideInches },
      { thetaDeg: sideAngle },
    ],
    radius: spec.centerlineRadius,
    spec,
    angleDeg: angle,
    unit,
  });
}

/** 4-point saddle：四弯均为 θ，顶点距依次 leg、width、leg。 */
export function fourPointSaddleFeasibility(
  legInches: number,
  widthInches: number,
  angle: OffsetAngle,
  spec: BenderSpec,
  unit?: UnitSystem,
): FeasibilityResult {
  return evaluateFeasibility({
    bends: [
      { thetaDeg: angle, vertexDistanceToNext: legInches },
      { thetaDeg: angle, vertexDistanceToNext: widthInches },
      { thetaDeg: angle, vertexDistanceToNext: legInches },
      { thetaDeg: angle },
    ],
    radius: spec.centerlineRadius,
    spec,
    angleDeg: angle,
    unit,
  });
}

/** Stub：单弯，无直段，只做 min stub 校核。 */
export function stubFeasibility(
  stubHeightInches: number,
  spec: BenderSpec,
  unit?: UnitSystem,
): FeasibilityResult {
  return evaluateFeasibility({
    bends: [{ thetaDeg: 90 }],
    radius: spec.centerlineRadius,
    stubHeightInches,
    spec,
    unit,
  });
}

/** Kicked 90°：90° + κ，顶点距 = L + R·tan45° + R·tan(κ/2)。 */
export function kicked90Feasibility(
  kickAngleDeg: number,
  straightLengthInches: number,
  spec: BenderSpec,
  unit?: UnitSystem,
): FeasibilityResult {
  const r = spec.centerlineRadius;
  const vertexDistanceToNext =
    straightLengthInches +
    r * Math.tan(Math.PI / 4) +
    r * Math.tan((kickAngleDeg * RADIANS_PER_DEGREE) / 2);
  return evaluateFeasibility({
    bends: [
      { thetaDeg: 90, vertexDistanceToNext },
      { thetaDeg: kickAngleDeg },
    ],
    radius: spec.centerlineRadius,
    spec,
    unit,
  });
}
