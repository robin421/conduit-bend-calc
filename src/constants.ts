/**
 * 数学常数集中定义。数值必须与 docs/PRD.md 第 10 节逐项一致。
 */

export interface OffsetConstant {
  angle: number;
  /** 两标记间距倍数 */
  multiplier: number;
  /** 每英寸障碍高度的 shrink 回补量（英寸） */
  shrinkPerInch: number;
}

export const OFFSET_ANGLES = [10, 15, 22.5, 30, 45, 60] as const;

export type OffsetAngle = (typeof OFFSET_ANGLES)[number];

export const OFFSET_CONSTANTS: Record<OffsetAngle, OffsetConstant> = {
  10: { angle: 10, multiplier: 6.0, shrinkPerInch: 1 / 16 },
  15: { angle: 15, multiplier: 3.9, shrinkPerInch: 1 / 8 },
  22.5: { angle: 22.5, multiplier: 2.6, shrinkPerInch: 3 / 16 },
  30: { angle: 30, multiplier: 2.0, shrinkPerInch: 1 / 4 },
  45: { angle: 45, multiplier: 1.4, shrinkPerInch: 3 / 8 },
  60: { angle: 60, multiplier: 1.2, shrinkPerInch: 1 / 2 },
};
