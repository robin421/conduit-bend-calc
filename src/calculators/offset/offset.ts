import { OFFSET_CONSTANTS } from '../../constants.ts';
import type { OffsetAngle } from '../../constants.ts';

export interface OffsetResult {
  /** 两标记间距（英寸） = 障碍高度 × multiplier */
  distanceBetweenBends: number;
  /** shrink 回补量（英寸） = 障碍高度 × shrink per inch */
  shrink: number;
  multiplier: number;
}

/**
 * Offset 弯管计算。height 为障碍高度（英寸），angle 为预设弯曲角度。
 * 非法输入（非有限数、<= 0、非预设角度）返回 null，不抛异常。
 */
export function calculateOffset(
  heightInches: number,
  angle: OffsetAngle,
): OffsetResult | null {
  if (!Number.isFinite(heightInches) || heightInches <= 0) {
    return null;
  }

  const constant = OFFSET_CONSTANTS[angle];
  if (!constant) {
    return null;
  }

  return {
    distanceBetweenBends: heightInches * constant.multiplier,
    shrink: heightInches * constant.shrinkPerInch,
    multiplier: constant.multiplier,
  };
}
