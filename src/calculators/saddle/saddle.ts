import { OFFSET_CONSTANTS } from '../../constants.ts';
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
 * 3-point saddle 计算。height 为障碍高度（英寸），angle 为预设弯曲角度，
 * centerlineRadius 为所选弯管机的 R（缺省为默认规格的 R）。
 * 中心标记对准障碍物中心，两侧弯曲点距中心 = 高度 × multiplier（trade 习惯值，与 v1.0.0 一致）。
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

  const spacing = resolved.geometry.spacingDisplay;
  const marks: SaddleMark[] = [
    {
      id: 1,
      label: 'Mark 1',
      fromCenterInches: -spacing,
      instruction: '左侧弯曲点：从中心标记向左量「弯曲点间距」',
    },
    {
      id: 2,
      label: 'Mark 2（中心）',
      fromCenterInches: 0,
      instruction: '鞍座中心：对准障碍物中心',
    },
    {
      id: 3,
      label: 'Mark 3',
      fromCenterInches: spacing,
      instruction: '右侧弯曲点：从中心标记向右量「弯曲点间距」',
    },
  ];

  return {
    angle,
    multiplier: resolved.multiplier,
    markSpacingInches: spacing,
    centerMarkPositionInches: spacing,
    marks,
    spanInches: spacing * 2,
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
      instruction: '左侧弯曲点：从左侧障碍边缘向外量「弯曲点间距」',
    },
    {
      id: 2,
      label: 'Mark 2',
      fromCenterInches: -halfWidth,
      instruction: '左侧障碍边缘',
    },
    {
      id: 3,
      label: 'Mark 3',
      fromCenterInches: halfWidth,
      instruction: '右侧障碍边缘',
    },
    {
      id: 4,
      label: 'Mark 4',
      fromCenterInches: halfWidth + leg,
      instruction: '右侧弯曲点：从右侧障碍边缘向外量「弯曲点间距」',
    },
  ];

  return {
    angle,
    multiplier: resolved.multiplier,
    markSpacingInches: leg,
    centerMarkPositionInches: halfWidth + leg,
    marks,
    spanInches: leg * 2 + widthInches,
    legGeometry: resolved.geometry,
  };
}
