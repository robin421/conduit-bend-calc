import { OFFSET_CONSTANTS } from '../../constants.ts';
import type { OffsetAngle } from '../../constants.ts';
import { defaultBenderSpec } from '../geometry/benderSpecs.ts';
import {
  calculateOffsetGeometry,
} from '../geometry/geometry.ts';
import type { OffsetGeometry } from '../geometry/geometry.ts';

export interface OffsetResult {
  /** 两标记间距（英寸）：trade 习惯值（D1），与 v1.0.0 一致 */
  distanceBetweenBends: number;
  /** shrink 回补量（英寸）：trade 习惯值（D1），与 v1.0.0 一致 */
  shrink: number;
  multiplier: number;
  /**
   * 引擎几何详情（内部料长/预警用，不展示）。
   * 显示字段仍走 trade 常数表，保证与 v1.0.0 显示一致。
   */
  geometry: OffsetGeometry;
}

/**
 * Offset 弯管计算。height 为障碍高度（英寸），angle 为预设弯曲角度，
 * centerlineRadius 为所选弯管机的 R（缺省为默认规格的 R）。
 * 计算经由几何引擎；显示值保持 trade 习惯值，与 v1.0.0 一致。
 * 非法输入（非有限数、<= 0、非预设角度）返回 null，不抛异常。
 */
export function calculateOffset(
  heightInches: number,
  angle: OffsetAngle,
  centerlineRadius: number = defaultBenderSpec().centerlineRadius,
): OffsetResult | null {
  if (!Number.isFinite(heightInches) || heightInches <= 0) {
    return null;
  }

  const constant = OFFSET_CONSTANTS[angle];
  if (!constant) {
    return null;
  }

  const geometry = calculateOffsetGeometry(
    heightInches,
    angle,
    centerlineRadius,
  );
  if (!geometry) {
    return null;
  }

  return {
    distanceBetweenBends: geometry.spacingDisplay,
    shrink: geometry.shrinkDisplay,
    multiplier: constant.multiplier,
    geometry,
  };
}
