import type { BenderSpec } from '../../constants.ts';
import {
  calibrateRadiusFromGain,
  calibrateTakeUp,
} from '../geometry/geometry.ts';
import { createCustomSpec } from '../geometry/benderSpecs.ts';

export interface GainCalibrationResult {
  /** G = A + B − L₀（英寸） */
  gain: number;
  /** R = G / (2 − π/2)（英寸），引擎内用 GAIN_90_FACTOR */
  radius: number;
}

/**
 * Gain 法校 R：取已知长 L₀ 废料，中部弯 90°，量两腿 A、B
 * （back-of-bend 到端头，trade 量法）。G = A+B−L₀，R = G/(2−π/2)。
 * 非法输入或 G ≤ 0 返回 null，不抛异常。
 */
export function calibrateGain(
  knownLengthInches: number,
  legAInches: number,
  legBInches: number,
): GainCalibrationResult | null {
  const radius = calibrateRadiusFromGain(
    knownLengthInches,
    legAInches,
    legBInches,
  );
  if (radius === null) {
    return null;
  }
  return {
    gain: legAInches + legBInches - knownLengthInches,
    radius,
  };
}

/**
 * Stub 法校 take-up：用旧 take-up 做一个目标高度 stub，量出实际高度，
 * effective take-up = oldTakeUp + (actual − target)。
 * 非法输入或结果非正返回 null，不抛异常。
 */
export function calibrateStubTakeUp(
  oldTakeUpInches: number,
  targetHeightInches: number,
  actualHeightInches: number,
): number | null {
  return calibrateTakeUp(oldTakeUpInches, targetHeightInches, actualHeightInches);
}

/**
 * 用校准值组装 Custom 规格并返回（未校准的项沿用基准规格）。
 * name 为空或数值非法返回 null。
 */
export function buildCalibratedSpec(
  name: string,
  base: BenderSpec,
  radius: number | null,
  takeUp: number | null,
): BenderSpec | null {
  return createCustomSpec(
    name,
    radius ?? base.centerlineRadius,
    takeUp ?? base.takeUp,
  );
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Guided Calibration 第一步：由一次 90° 试弯反推 Actual Deduct。
 * 管端在 `markDistanceInches` 处做标记、箭头对准标记弯 90°，实测 stub 高度 S
 * （管端到弯背）→ Actual Deduct = S − markDistance。
 * 产品决策 2：12" 标记时 S=17 3/8" → 5 3/8"，自洽。
 * 非法输入或结果非正返回 null，不抛异常。
 */
export function calibrateDeductFromStub(
  markDistanceInches: number,
  measuredStubInches: number,
): number | null {
  if (!isPositiveFinite(markDistanceInches) || !isPositiveFinite(measuredStubInches)) {
    return null;
  }
  const deduct = measuredStubInches - markDistanceInches;
  return deduct > 0 ? deduct : null;
}

/**
 * Guided Calibration 第二步：用 deduct 比例估计 Actual Radius。
 * Actual Radius = nominal R × (actualDeduct / nominalDeduct)，为初值估计
 * （明确标注为估计值），后续由 Expected→Actual 闭环持续修正。
 * 三个输入都须为正有限数，否则返回 null。
 */
export function estimateRadiusFromDeduct(
  nominalRadius: number,
  nominalDeduct: number,
  actualDeduct: number,
): number | null {
  if (
    !isPositiveFinite(nominalRadius) ||
    !isPositiveFinite(nominalDeduct) ||
    !isPositiveFinite(actualDeduct)
  ) {
    return null;
  }
  return nominalRadius * (actualDeduct / nominalDeduct);
}

export interface GuidedCalibrationResult {
  /** 实测 stub 高度（英寸，原样） */
  measuredStubInches: number;
  /** 标记距离（英寸，原样，试弯固定 12） */
  markDistanceInches: number;
  /** Actual Deduct = S − 标记距离 */
  actualDeduct: number;
  /** 估计 Actual Radius */
  estimatedRadius: number;
}

/**
 * Guided Calibration 纯计算：一次 90° 试弯 → Actual Deduct + 估计 Actual Radius。
 * 非法输入返回 null，不抛异常。
 */
export function calibrateFromTestBend(
  markDistanceInches: number,
  measuredStubInches: number,
  nominalRadius: number,
  nominalDeduct: number,
): GuidedCalibrationResult | null {
  const actualDeduct = calibrateDeductFromStub(markDistanceInches, measuredStubInches);
  if (actualDeduct === null) {
    return null;
  }
  const estimatedRadius = estimateRadiusFromDeduct(
    nominalRadius,
    nominalDeduct,
    actualDeduct,
  );
  if (estimatedRadius === null) {
    return null;
  }
  return {
    measuredStubInches,
    markDistanceInches,
    actualDeduct,
    estimatedRadius,
  };
}

/** Expected→Actual 误差（英寸）= actual − expected。非法输入返回 null。 */
export function expectedActualError(
  expectedInches: number,
  actualInches: number,
): number | null {
  if (!Number.isFinite(expectedInches) || !Number.isFinite(actualInches)) {
    return null;
  }
  return actualInches - expectedInches;
}

export interface ExpectedActualUpdate {
  /** 本次误差 = actual − expected */
  error: number;
  /** 更新后的累积校正量 */
  offset: number;
}

/**
 * Expected→Actual 校准闭环：把本次误差累加到累积校正量上。
 * 下次计算时 result + calibrationOffset 会更接近实际。
 * 非法输入返回 null，不抛异常。
 */
export function applyExpectedActualCorrection(
  currentOffset: number,
  expectedInches: number,
  actualInches: number,
): ExpectedActualUpdate | null {
  if (!Number.isFinite(currentOffset)) {
    return null;
  }
  const error = expectedActualError(expectedInches, actualInches);
  if (error === null) {
    return null;
  }
  return { error, offset: currentOffset + error };
}
