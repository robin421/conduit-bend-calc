import { OFFSET_CONSTANTS } from '../../constants.ts';
import type { OffsetAngle } from '../../constants.ts';
import { defaultBenderSpec } from '../geometry/benderSpecs.ts';
import { calculateRollingOffsetGeometry } from '../geometry/geometry.ts';
import type { RollingOffsetGeometry } from '../geometry/geometry.ts';

export interface RollingOffsetMark {
  /** 从 1 开始的标记序号 */
  id: number;
  /** 显示名称，如 "Mark 1" */
  label: string;
  /** 距 Mark 1 的距离（英寸） */
  fromStartInches: number;
  /** 现场操作说明（一句话） */
  instruction: string;
}

export interface RollingOffsetResult {
  angle: OffsetAngle;
  /** 真实偏移量（英寸）= √(rise² + roll²) */
  trueOffset: number;
  /** 弯管机旋转角（度）= atan(roll/rise) */
  rollAngleDeg: number;
  /** 两标记间距（英寸）：trade 习惯值（D1），与 Offset 一致 */
  spacingDisplay: number;
  /** shrink 回补量（英寸）：trade 习惯值（D1） */
  shrinkDisplay: number;
  /** 两个弯曲点标记 */
  marks: RollingOffsetMark[];
  /** 引擎几何详情（内部料长/预警用，不展示） */
  geometry: RollingOffsetGeometry;
}

/**
 * Rolling offset 计算：先算真实偏移量 H = √(rise²+roll²)，再按 offset 算。
 * riseInches 为上升高度，rollInches 为侧滚距离，angle 为预设弯曲角度，
 * centerlineRadius 为所选弯管机的 R（缺省为默认规格的 R）。
 * 非法输入返回 null，不抛异常。
 */
export function calculateRollingOffset(
  riseInches: number,
  rollInches: number,
  angle: OffsetAngle,
  centerlineRadius: number = defaultBenderSpec().centerlineRadius,
): RollingOffsetResult | null {
  const constant = OFFSET_CONSTANTS[angle];
  if (!constant) {
    return null;
  }
  const geometry = calculateRollingOffsetGeometry(
    riseInches,
    rollInches,
    angle,
    centerlineRadius,
  );
  if (!geometry) {
    return null;
  }
  const spacing = geometry.spacingDisplay;
  return {
    angle,
    trueOffset: geometry.trueOffset,
    rollAngleDeg: geometry.rollAngleDeg,
    spacingDisplay: spacing,
    shrinkDisplay: geometry.shrinkDisplay,
    marks: [
      {
        id: 1,
        label: 'Mark 1',
        fromStartInches: 0,
        instruction: 'First bend point (reference start)',
      },
      {
        id: 2,
        label: 'Mark 2',
        fromStartInches: spacing,
        instruction: 'Second bend point: measure "mark spacing" from Mark 1',
      },
    ],
    geometry,
  };
}
