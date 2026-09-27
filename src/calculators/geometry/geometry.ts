/**
 * 几何引擎：centerline radius 弯管计算（v1.1）。
 * 实现依据：docs/geometry-engine-spec.md（唯一的算法依据）。
 *
 * 约定：
 * - 角度在函数内部一律用弧度；对外入口用角度数（UI 层传度）。
 * - Gain 全工程统一 trade 正值：G(θ) = 2R·tan(θ/2) − Rθ。
 *   ⚠️ QuickBend 官方文档的 gain 与此互为相反数（它的 = 弧长 − 2×切线长），
 *   对照 QuickBend 文档时必须取反。
 * - 显示值遵守 D1：trade 习惯值（预设角度用 v1.0.0 常数表，与老版本显示一致）；
 *   精确式只用于内部料长与预警计算。
 * - spec §9 的未验证公式以 ⚠️ 标出，不得当作既定事实对外展示。
 */

import {
  GAIN_90_FACTOR,
  MIN_STUB_TABLE,
  OFFSET_ANGLES,
  OFFSET_CONSTANTS,
  RADIANS_PER_DEGREE,
} from '../../constants.ts';
import type { BenderSpec, OffsetAngle } from '../../constants.ts';

function isPresetAngle(thetaDeg: number): thetaDeg is OffsetAngle {
  return (OFFSET_ANGLES as readonly number[]).includes(thetaDeg);
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** 度 → 弧度。非法输入返回 null，不抛异常。 */
export function degToRad(degrees: number): number | null {
  if (!Number.isFinite(degrees)) {
    return null;
  }
  return degrees * RADIANS_PER_DEGREE;
}

/**
 * Gain（trade 正值约定）：G(θ) = 2R·tan(θ/2) − Rθ。✅ 已验证（初等圆切线几何）。
 * 例：G₉₀ = 0.4292R。
 * 非法输入（R <= 0、θ 不在 (0, π) 内）返回 null。
 */
export function gain(
  centerlineRadius: number,
  thetaRad: number,
): number | null {
  if (!isPositiveFinite(centerlineRadius)) {
    return null;
  }
  if (!Number.isFinite(thetaRad) || thetaRad <= 0 || thetaRad >= Math.PI) {
    return null;
  }
  return (
    2 * centerlineRadius * Math.tan(thetaRad / 2) -
    centerlineRadius * thetaRad
  );
}

export interface OffsetGeometry {
  /**
   * 显示用间距（英寸）：trade 习惯值（D1）。
   * 预设角度 = 高度 × v1.0.0 常数表 multiplier（与老版本显示一致）；
   * 非预设角度无表值，用精确顶点距。
   */
  spacingDisplay: number;
  /** 精确顶点距（英寸）= H·cscθ，与 R 无关 ✅（内部料长/预警用） */
  vertexSpacing: number;
  /** ⚠️ 推导未验证：切点 mark 距 = H·cscθ − G(θ)，仅内部计算用 */
  markSpacing: number;
  /**
   * 显示用 shrink（英寸）：trade 习惯值（D1）。
   * 预设角度 = 高度 × v1.0.0 常数表 shrinkPerInch；非预设角度用 H·tan(θ/2)。
   */
  shrinkDisplay: number;
  /** ⚠️ 推导未验证：精确 shrink = H·tan(θ/2) − 2G(θ)，内部料长用 */
  shrinkExact: number;
}

/**
 * Offset 几何。heightInches 为偏移高度，thetaDeg 为弯曲角度（度），
 * centerlineRadius 为所选弯管机的 R。
 */
export function calculateOffsetGeometry(
  heightInches: number,
  thetaDeg: number,
  centerlineRadius: number,
): OffsetGeometry | null {
  if (!isPositiveFinite(heightInches)) {
    return null;
  }
  if (!Number.isFinite(thetaDeg) || thetaDeg <= 0 || thetaDeg >= 180) {
    return null;
  }
  if (!isPositiveFinite(centerlineRadius)) {
    return null;
  }
  const thetaRad = thetaDeg * RADIANS_PER_DEGREE;
  const g = gain(centerlineRadius, thetaRad);
  if (g === null) {
    return null;
  }
  const vertexSpacing = heightInches / Math.sin(thetaRad);
  let spacingDisplay = vertexSpacing;
  let shrinkDisplay = heightInches * Math.tan(thetaRad / 2);
  if (isPresetAngle(thetaDeg)) {
    const constant = OFFSET_CONSTANTS[thetaDeg];
    spacingDisplay = heightInches * constant.multiplier;
    shrinkDisplay = heightInches * constant.shrinkPerInch;
  }
  return {
    spacingDisplay,
    vertexSpacing,
    // ⚠️ 推导未验证（spec §9.1）：trade 的 H·cscθ 是顶点距；
    // mark 打在切点（箭头位置）时需扣掉一个 gain。
    markSpacing: vertexSpacing - g,
    shrinkDisplay,
    // ⚠️ 推导未验证（spec §9.1）：按"展开管长 − 最终水平投影"定义推导。
    shrinkExact: heightInches * Math.tan(thetaRad / 2) - 2 * g,
  };
}

/**
 * 90° stub-up：mark = H − takeUp。✅ 已验证（Ideal 手册：
 * "subtract the takeup from the finished stub height… Line up the Arrow"）。
 * takeUp 取自所选 BenderSpec（D2：与 R 配对存储，禁止互相推导）。
 * 标记点非正或非法输入返回 null。
 */
export function calculateStubUpMark(
  stubHeightInches: number,
  spec: BenderSpec,
): number | null {
  if (!isPositiveFinite(stubHeightInches)) {
    return null;
  }
  if (!spec || !isPositiveFinite(spec.takeUp)) {
    return null;
  }
  const mark = stubHeightInches - spec.takeUp;
  return mark > 0 ? mark : null;
}

export interface Saddle3Geometry {
  centerAngleDeg: 45;
  sideAngleDeg: 22.5;
  /** 显示用两侧间距（英寸）：trade 习惯值 2.5H（D1） */
  sideSpacingDisplay: number;
  /** 精确值 = H·csc(22.5°) ≈ 2.613H ✅（push-thru 法用 2.61 佐证顶点几何） */
  sideSpacingExact: number;
  /**
   * ⚠️ 推导未验证（spec §9.2）：半径修正后的切点 mark 距
   * = 2.613H − R·tan(11.25°)，仅内部计算用。
   * 另：star/rim notch 是否对准顶点需实测，本函数假设对准顶点。
   */
  sideMarkSpacing: number;
}

/**
 * 3-point saddle 几何：中间 45°、两侧各 22.5° ✅。
 */
export function calculateSaddle3Geometry(
  heightInches: number,
  centerlineRadius: number,
): Saddle3Geometry | null {
  if (!isPositiveFinite(heightInches)) {
    return null;
  }
  if (!isPositiveFinite(centerlineRadius)) {
    return null;
  }
  const sideExact = heightInches / Math.sin(22.5 * RADIANS_PER_DEGREE);
  return {
    centerAngleDeg: 45,
    sideAngleDeg: 22.5,
    sideSpacingDisplay: heightInches * 2.5,
    sideSpacingExact: sideExact,
    sideMarkSpacing:
      sideExact - centerlineRadius * Math.tan(11.25 * RADIANS_PER_DEGREE),
  };
}

export interface Saddle4Geometry {
  /** 显示用每段间距（英寸）：trade 习惯值（D1），预设角度用常数表 */
  legSpacingDisplay: number;
  /** ⚠️ 推导未验证：每段切点 mark 距 = H·cscθ − G(θ) */
  legMarkSpacing: number;
  /** 总 shrink（英寸）= 2 × offset shrink（显示用 trade 值） */
  totalShrinkDisplay: number;
  /** 中间平段 W（英寸，原样返回） */
  flatWidth: number;
}

/**
 * 4-point saddle 几何 = 两个 offset + 中间平段 W ✅。
 */
export function calculateSaddle4Geometry(
  heightInches: number,
  thetaDeg: number,
  widthInches: number,
  centerlineRadius: number,
): Saddle4Geometry | null {
  const offset = calculateOffsetGeometry(
    heightInches,
    thetaDeg,
    centerlineRadius,
  );
  if (offset === null) {
    return null;
  }
  if (!isPositiveFinite(widthInches)) {
    return null;
  }
  return {
    legSpacingDisplay: offset.spacingDisplay,
    legMarkSpacing: offset.markSpacing,
    totalShrinkDisplay: offset.shrinkDisplay * 2,
    flatWidth: widthInches,
  };
}

export interface Kicked90Geometry {
  /** kick 角 κ（度，原样返回） */
  kickAngleDeg: number;
  /** 两弯之间的直段（英寸，切点到切点，原样返回） */
  straightLength: number;
  /** 90° 弯切线长（英寸）= R·tan(45°) = R */
  tangent90: number;
  /** kick 弯切线长（英寸）= R·tan(κ/2) */
  tangentKick: number;
  /** 总 gain（英寸）= G(90°) + G(κ) ✅ */
  totalGain: number;
  /** 90° 弧长（英寸）= R·π/2 */
  arc90: number;
  /** kick 弧长（英寸）= R·κ */
  arcKick: number;
}

/**
 * Kicked 90°：一个 90° + 一个 kick 角 κ（参数化，不写死）的复合弯 ✅ 定义明确。
 * 现场对"kick 在前还是在后、κ 取值"习惯不一，本函数只做几何，不管顺序。
 */
export function calculateKicked90Geometry(
  kickAngleDeg: number,
  straightLengthInches: number,
  centerlineRadius: number,
): Kicked90Geometry | null {
  if (
    !Number.isFinite(kickAngleDeg) ||
    kickAngleDeg <= 0 ||
    kickAngleDeg >= 90
  ) {
    return null;
  }
  if (!isPositiveFinite(straightLengthInches)) {
    return null;
  }
  if (!isPositiveFinite(centerlineRadius)) {
    return null;
  }
  const kappaRad = kickAngleDeg * RADIANS_PER_DEGREE;
  const g90 = gain(centerlineRadius, Math.PI / 2);
  const gKick = gain(centerlineRadius, kappaRad);
  if (g90 === null || gKick === null) {
    return null;
  }
  return {
    kickAngleDeg,
    straightLength: straightLengthInches,
    tangent90: centerlineRadius,
    tangentKick: centerlineRadius * Math.tan(kappaRad / 2),
    totalGain: g90 + gKick,
    arc90: centerlineRadius * (Math.PI / 2),
    arcKick: centerlineRadius * kappaRad,
  };
}

export interface RollingOffsetGeometry extends OffsetGeometry {
  /** 上升高度（英寸，原样返回） */
  rise: number;
  /** 侧滚距离（英寸，原样返回） */
  roll: number;
  /** 真实偏移量（英寸）= √(rise² + roll²) */
  trueOffset: number;
  /** 弯管机旋转角（度）= atan(roll/rise) */
  rollAngleDeg: number;
}

/**
 * Rolling offset：先算真实偏移量 H = √(rise²+roll²)，再按 offset 算。
 */
export function calculateRollingOffsetGeometry(
  riseInches: number,
  rollInches: number,
  thetaDeg: number,
  centerlineRadius: number,
): RollingOffsetGeometry | null {
  if (!isPositiveFinite(riseInches) || !isPositiveFinite(rollInches)) {
    return null;
  }
  const trueOffset = Math.hypot(riseInches, rollInches);
  const base = calculateOffsetGeometry(
    trueOffset,
    thetaDeg,
    centerlineRadius,
  );
  if (base === null) {
    return null;
  }
  return {
    ...base,
    rise: riseInches,
    roll: rollInches,
    trueOffset,
    rollAngleDeg: Math.atan2(rollInches, riseInches) / RADIANS_PER_DEGREE,
  };
}

export interface BendNode {
  /** 弯曲角度（度） */
  thetaDeg: number;
  /** 到下一个弯的顶点距（英寸）；最后一个弯可省略 */
  vertexDistanceToNext?: number;
}

export interface LayoutResult {
  /** 每段切点到切点的直段长（英寸），长度 = 弯数 − 1 */
  straights: number[];
  /** 总 gain（英寸）= ΣG(θᵢ)，用于算料长与 shrink */
  totalGain: number;
}

/**
 * 链式布 mark：直段(切点到切点) = D_v − R·tan(θᵢ/2) − R·tan(θᵢ₊₁/2)。
 * bends 为依次的弯；除最后一个外每个弯必须给出到下一弯的顶点距。
 */
export function layoutChain(
  bends: readonly BendNode[],
  centerlineRadius: number,
): LayoutResult | null {
  if (!Array.isArray(bends) || bends.length === 0) {
    return null;
  }
  if (!isPositiveFinite(centerlineRadius)) {
    return null;
  }
  const thetas: number[] = [];
  for (const bend of bends) {
    if (
      !bend ||
      !Number.isFinite(bend.thetaDeg) ||
      bend.thetaDeg <= 0 ||
      bend.thetaDeg >= 180
    ) {
      return null;
    }
    thetas.push(bend.thetaDeg * RADIANS_PER_DEGREE);
  }
  let totalGain = 0;
  for (const thetaRad of thetas) {
    const g = gain(centerlineRadius, thetaRad);
    if (g === null) {
      return null;
    }
    totalGain += g;
  }
  const straights: number[] = [];
  for (let i = 0; i < bends.length - 1; i += 1) {
    const bend = bends[i];
    const vertexDistance = bend ? bend.vertexDistanceToNext : undefined;
    if (!isPositiveFinite(vertexDistance)) {
      return null;
    }
    const straight =
      vertexDistance -
      centerlineRadius * Math.tan(thetas[i] / 2) -
      centerlineRadius * Math.tan(thetas[i + 1] / 2);
    straights.push(straight);
  }
  return { straights, totalGain };
}

export type WarningLevel = 'error' | 'warning' | 'info';

export interface LayoutWarning {
  level: WarningLevel;
  /** 展示文案 */
  message: string;
}

export interface ValidateInput {
  /** 切点到切点的直段长（英寸），来自 layoutChain */
  straights?: readonly number[];
  /** stub 目标高度（英寸），用于 min stub 预警 */
  stubHeightInches?: number | null;
  /** 所选弯管机规格，用于 min stub / NEC 预警 */
  spec?: BenderSpec | null;
}

/**
 * 不可行弯预警（D5：v1 只做有依据的）。
 * - 任一直段 < 0 → error「这个弯做不出来」（对标 QuickBend "impossible turn red"）
 * - stub 高度 < min stub → warning（min stub 表只收录公开值，查不到的不预警）
 * - 1/2" 管 R < 4" → info（NEC 要求）
 */
export function validateLayout(input: ValidateInput): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  const straights = input.straights ?? [];
  for (const straight of straights) {
    if (Number.isFinite(straight) && straight < 0) {
      warnings.push({
        level: 'error',
        message: "Can't make this bend: the two bend marks overlap — increase the spacing or use a smaller angle",
      });
      break;
    }
  }
  const spec = input.spec ?? null;
  const stubHeight = input.stubHeightInches ?? null;
  if (spec && stubHeight !== null && Number.isFinite(stubHeight)) {
    const entry = MIN_STUB_TABLE.find(
      (row) =>
        row.brand === spec.brand &&
        row.model === spec.model &&
        row.conduit === spec.conduit,
    );
    if (entry && stubHeight < entry.minStubInches) {
      warnings.push({
        level: 'warning',
        message: `Target height is below this bender's minimum stub (${entry.minStubInches}") — the bend may not be possible`,
      });
    }
  }
  if (spec && isPositiveFinite(spec.centerlineRadius)) {
    if (spec.conduit.startsWith('1/2') && spec.centerlineRadius < 4) {
      warnings.push({
        level: 'info',
        message: 'NEC requires a minimum 4" bend radius for 1/2" conduit — current R is too small',
      });
    }
  }
  return warnings;
}

/**
 * Gain 法校 R：取已知长 L₀ 废料，中部弯 90°，量两腿 A、B
 * （back-of-bend 到端头，trade 量法），G = A+B−L₀，R = G/0.4292。✅
 * 与 head 的箭头 datum 无关，数学精确。
 * G <= 0 或非法输入返回 null。
 */
export function calibrateRadiusFromGain(
  knownLengthInches: number,
  legAInches: number,
  legBInches: number,
): number | null {
  if (
    !isPositiveFinite(knownLengthInches) ||
    !isPositiveFinite(legAInches) ||
    !isPositiveFinite(legBInches)
  ) {
    return null;
  }
  const g = legAInches + legBInches - knownLengthInches;
  if (!(g > 0)) {
    return null;
  }
  return g / GAIN_90_FACTOR;
}

/**
 * Stub-up 校 take-up：用旧 take-up 做一个目标高度 stub，
 * 量出实际高度，effective take-up = oldTakeUp + (actual − target)。✅
 * 非法输入或结果非正返回 null。
 */
export function calibrateTakeUp(
  oldTakeUpInches: number,
  targetHeightInches: number,
  actualHeightInches: number,
): number | null {
  if (
    !isPositiveFinite(oldTakeUpInches) ||
    !isPositiveFinite(targetHeightInches) ||
    !isPositiveFinite(actualHeightInches)
  ) {
    return null;
  }
  const effective = oldTakeUpInches + (actualHeightInches - targetHeightInches);
  return effective > 0 ? effective : null;
}
