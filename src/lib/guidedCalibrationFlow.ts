/**
 * Guided Calibration 步骤流纯逻辑（P0 收尾 C）。
 *
 * 现场向导：一步一屏，用户只做可现场测量的动作，不接触 R / take-up 等工程参数。
 *   Step 1 管端 12" 做标记 → Step 2 箭头对准标记弯 90° →
 *   Step 3 输入成品 stub 高度 S → 自动算 Actual Deduct = S − 12" →
 *   Step 4 完成 + 命名 + 保存（R/take-up 只写入 profile，不展示）。
 *
 * 纯 TypeScript（只依赖 calibration / profile 纯函数），可被 node --test 直接 import。
 */

import { calibrateFromTestBend } from '../calculators/calibration/calibration.ts';
import type { GuidedCalibrationResult } from '../calculators/calibration/calibration.ts';
import type { BenderProfile } from './profile.ts';
import { withCalibration } from './profile.ts';

/** 试弯固定标记距离（英寸）：管端 12" 处做标记。 */
export const TEST_BEND_MARK = 12;

/** 向导步骤（一步一屏）。 */
export type GuidedStep = 1 | 2 | 3 | 4;

export const GUIDED_STEPS: readonly GuidedStep[] = [1, 2, 3, 4];
export const FIRST_GUIDED_STEP: GuidedStep = 1;
export const LAST_GUIDED_STEP: GuidedStep = 4;
/** 输入 stub 高度的步骤（唯一需要数值输入的步骤）。 */
export const MEASURE_STEP: GuidedStep = 3;

export function isGuidedStep(value: number): value is GuidedStep {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/** 下一步（末步保持）——供 [下一步] 与 Android 返回键反向使用。 */
export function nextGuidedStep(step: GuidedStep): GuidedStep {
  return (step < LAST_GUIDED_STEP ? step + 1 : LAST_GUIDED_STEP) as GuidedStep;
}

/** 上一步（首步保持）。 */
export function prevGuidedStep(step: GuidedStep): GuidedStep {
  return (step > FIRST_GUIDED_STEP ? step - 1 : FIRST_GUIDED_STEP) as GuidedStep;
}

/** 进度：当前是第几步 / 共几步（从 1 开始）。 */
export function guidedStepProgress(step: GuidedStep): { current: number; total: number } {
  return { current: GUIDED_STEPS.indexOf(step) + 1, total: GUIDED_STEPS.length };
}

/**
 * Step 3 纯计算：由成品 stub 高度 S 反推 Actual Deduct = S − 12"。
 * 界面只用 `measuredStubInches` 与 `actualDeduct`；`estimatedRadius` 仅写入 profile。
 * 输入非法（含 S ≤ 12"）返回 null，不抛异常。
 */
export function computeGuidedCalibration(
  measuredStubInches: number | null,
  base: BenderProfile,
): GuidedCalibrationResult | null {
  if (measuredStubInches === null) {
    return null;
  }
  const nominalDeduct = base.nominalDeduct ?? base.takeUp;
  return calibrateFromTestBend(
    TEST_BEND_MARK,
    measuredStubInches,
    base.bendRadius,
    nominalDeduct,
  );
}

/**
 * 能否从当前步骤前进到下一步。
 * Step 3 需要有效实测值（S > 12" 且反推 deduct 为正）；末步不能再前进。
 */
export function canAdvanceGuidedStep(
  step: GuidedStep,
  measuredStubInches: number | null,
  base: BenderProfile,
): boolean {
  if (step === LAST_GUIDED_STEP) {
    return false;
  }
  if (step === MEASURE_STEP) {
    return computeGuidedCalibration(measuredStubInches, base) !== null;
  }
  return true;
}

/**
 * 由完成页的名称 + 反推结果组装 calibrated 档案。
 * 名称为空或结果缺失返回 null，不抛异常。
 */
export function buildGuidedProfile(
  base: BenderProfile,
  name: string,
  result: GuidedCalibrationResult | null,
  now: number,
): BenderProfile | null {
  const trimmed = name.trim();
  if (trimmed === '' || result === null) {
    return null;
  }
  return withCalibration(base, {
    name: trimmed,
    actualDeduct: result.actualDeduct,
    bendRadius: result.estimatedRadius,
    calibrationDate: now,
  });
}

export type { GuidedCalibrationResult };
