import { OFFSET_CONSTANTS, RADIANS_PER_DEGREE } from '../../constants.ts';
import type { OffsetAngle } from '../../constants.ts';
import { defaultBenderSpec } from '../geometry/benderSpecs.ts';
import { calculateOffsetGeometry } from '../geometry/geometry.ts';
import type { OffsetGeometry } from '../geometry/geometry.ts';

export interface SaddleMark {
  /** 从 1 开始的标记序号 */
  id: number;
  /** 显示名称，如 "Mark 1" */
  label: string;
  /** 相对鞍座中心的位置（英寸，正 = 右侧，负 = 左侧，0 = 中心） */
  fromCenterInches: number;
  /** 现场操作说明（一句话） */
  instruction: string;
}

export interface SaddleResult {
  angle: OffsetAngle;
  multiplier: number;
  /**
   * 弯曲点间距（英寸）= 障碍高度 × multiplier。
   * 3 点为弯曲点到中心的距离；4 点为弯曲点到相邻障碍边缘的距离。
   */
  markSpacingInches: number;
  /** 中心标记相对第一个标记（Mark 1）的位置（英寸） */
  centerMarkPositionInches: number;
  /** 全部标记，按从 Mark 1 到 Mark N 依次排列 */
  marks: SaddleMark[];
  /** 总跨度：Mark 1 到 Mark N 的距离（英寸） */
  spanInches: number;
  /**
   * 3 点鞍弯中心标记 shrink（英寸，T28）：H × shrinkPerInch(中心角/2)。
   * 4 点鞍弯不填（用 totalShrinkInches）。
   */
  shrinkInches?: number;
  /**
   * 4 点鞍弯总 shrink（英寸，T30）= 2 × offset shrink（trade 显示值）。
   * 从固定点起算时，加到 true center 上。3 点鞍弯不填。
   */
  totalShrinkInches?: number;
  /**
   * 引擎几何详情（单腿，内部料长/预警用，不展示）。
   * 显示字段仍走 trade 常数表，保证与 v1.0.0 显示一致。
   */
  legGeometry: OffsetGeometry;
}

function resolveGeometry(
  heightInches: number,
  angle: OffsetAngle,
  centerlineRadius: number,
): { multiplier: number; geometry: OffsetGeometry } | null {
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
  return { multiplier: constant.multiplier, geometry };
}

/**
 * 3 点鞍弯标记间距乘数（T27 现场验证修正）。
 * 现场命名角度恒指中心弯（"45 on center, 22 1/2 on sides"），
 * 两侧标记距中心 = H × multiplier(中心角/2)：
 * - 45° 中心用 trade 习惯值 2.5（Ideal/Elliott/学徒教材多方一致；精确 2.613H = H·csc22.5°）
 * - 中心角/2 为预设角度时用常数表 multiplier（D1）
 * - 非常见中心角时用精确 H·csc(θ/2)
 */
export function saddle3SpacingMultiplier(angle: OffsetAngle): number {
  if (angle === 45) {
    return 2.5;
  }
  const half = angle / 2;
  const constant = OFFSET_CONSTANTS[half as OffsetAngle];
  if (constant) {
    return constant.multiplier;
  }
  return 1 / Math.sin(half * RADIANS_PER_DEGREE);
}

/**
 * 3 点鞍弯中心标记 shrink（每英寸，T28 现场验证补充）。
 * 现场做法：中心标记加 shrink；45° 标准为 H×3/16"（恰为 22.5° 侧边角的 trade 表值）。
 * 推广：用侧边角（中心角/2）的 trade shrink 表值；非常见角时回退精确 H·tan(θ_side/2)。
 */
export function saddle3ShrinkPerInch(angle: OffsetAngle): number {
  const half = angle / 2;
  const constant = OFFSET_CONSTANTS[half as OffsetAngle];
  if (constant) {
    return constant.shrinkPerInch;
  }
  return Math.tan((half / 2) * RADIANS_PER_DEGREE);
}

/**
 * 3-point saddle 计算。height 为障碍高度（英寸），angle 为预设弯曲角度（= 中心弯角度），
 * centerlineRadius 为所选弯管机的 R（缺省为默认规格的 R）。
 * 中心标记对准障碍物中心，两侧弯曲点距中心 = 高度 × saddle3SpacingMultiplier(angle)
 *（T27：现场命名角度指中心弯，间距用半角乘数；45° 中心→2.5H）。
 * 非法输入返回 null，不抛异常。
 */
export function calculateThreePointSaddle(
  heightInches: number,
  angle: OffsetAngle,
  centerlineRadius: number = defaultBenderSpec().centerlineRadius,
): SaddleResult | null {
  const resolved = resolveGeometry(heightInches, angle, centerlineRadius);
  if (!resolved) {
    return null;
  }

  const multiplier = saddle3SpacingMultiplier(angle);
  const spacing = heightInches * multiplier;
  const shrink = heightInches * saddle3ShrinkPerInch(angle);
  const marks: SaddleMark[] = [
    {
      id: 1,
      label: 'Mark 1',
      fromCenterInches: -spacing,
      instruction: 'Left bend point: measure "bend spacing" left from the center mark — use the arrow',
    },
    {
      id: 2,
      label: 'Mark 2 (center)',
      fromCenterInches: 0,
      instruction: 'Saddle center: align with the obstacle center — use the rim notch',
    },
    {
      id: 3,
      label: 'Mark 3',
      fromCenterInches: spacing,
      instruction: 'Right bend point: measure "bend spacing" right from the center mark — use the arrow',
    },
  ];

  return {
    angle,
    multiplier,
    markSpacingInches: spacing,
    centerMarkPositionInches: spacing,
    marks,
    spanInches: spacing * 2,
    shrinkInches: shrink,
    legGeometry: resolved.geometry,
  };
}

/**
 * 4-point saddle 计算。height 为障碍高度、width 为障碍宽度（英寸），
 * angle 为预设弯曲角度，centerlineRadius 为所选弯管机的 R（缺省为默认规格的 R）。
 * 两个内侧标记对准障碍两侧边缘，外侧弯曲点分别再向外量 高度 × multiplier
 * （trade 习惯值，与 v1.0.0 一致）。
 * 非法输入返回 null，不抛异常。
 */
export function calculateFourPointSaddle(
  heightInches: number,
  widthInches: number,
  angle: OffsetAngle,
  centerlineRadius: number = defaultBenderSpec().centerlineRadius,
): SaddleResult | null {
  const resolved = resolveGeometry(heightInches, angle, centerlineRadius);
  if (!resolved) {
    return null;
  }
  if (!Number.isFinite(widthInches) || widthInches <= 0) {
    return null;
  }

  const leg = resolved.geometry.spacingDisplay;
  const halfWidth = widthInches / 2;
  const marks: SaddleMark[] = [
    {
      id: 1,
      label: 'Mark 1',
      fromCenterInches: -(halfWidth + leg),
      instruction: 'Left bend point: measure "bend spacing" outward from the left obstacle edge — use the arrow',
    },
    {
      id: 2,
      label: 'Mark 2',
      fromCenterInches: -halfWidth,
      instruction: 'Left obstacle edge',
    },
    {
      id: 3,
      label: 'Mark 3',
      fromCenterInches: halfWidth,
      instruction: 'Right obstacle edge',
    },
    {
      id: 4,
      label: 'Mark 4',
      fromCenterInches: halfWidth + leg,
      instruction: 'Right bend point: measure "bend spacing" outward from the right obstacle edge — use the arrow',
    },
  ];

  return {
    angle,
    multiplier: resolved.multiplier,
    markSpacingInches: leg,
    centerMarkPositionInches: halfWidth + leg,
    marks,
    spanInches: leg * 2 + widthInches,
    totalShrinkInches: resolved.geometry.shrinkDisplay * 2,
    legGeometry: resolved.geometry,
  };
}
