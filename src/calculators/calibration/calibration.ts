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
