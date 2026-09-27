import { defaultBenderSpec } from '../geometry/benderSpecs.ts';
import { calculateKicked90Geometry } from '../geometry/geometry.ts';
import type { Kicked90Geometry } from '../geometry/geometry.ts';

export interface Kicked90Mark {
  /** 从 1 开始的标记序号 */
  id: number;
  /** 显示名称 */
  label: string;
  /** 沿管展开长距 Mark 1 的距离（英寸） */
  developedInches: number;
  /** 现场操作说明（一句话） */
  instruction: string;
}

export interface Kicked90Result {
  /** kick 角 κ（度，原样返回） */
  kickAngleDeg: number;
  /** 两弯之间的直段（英寸，切点到切点，原样返回） */
  straightLength: number;
  /** 总 gain（英寸）= G(90°) + G(κ)，用于算料长 */
  totalGain: number;
  /** 两个弯的标记（沿管展开长） */
  marks: Kicked90Mark[];
  /** 引擎几何详情（内部料长/预警用） */
  geometry: Kicked90Geometry;
}

/**
 * Kicked 90° 计算：一个 90° + 一个 kick 角 κ 的复合弯。
 * kickAngleDeg 为 kick 角（度，0 < κ < 90，参数化不写死），
 * straightLengthInches 为两弯之间的直段（英寸，切点到切点），
 * centerlineRadius 为所选弯管机的 R（缺省为默认规格的 R）。
 * 标记按沿管展开长给出：Mark 1 为 90° 弯起点（切点，参考点），
 * Mark 2 为 kick 弯起点（切点），距 Mark 1 为 90° 弧长 + 直段。
 * 非法输入返回 null，不抛异常。
 */
export function calculateKicked90(
  kickAngleDeg: number,
  straightLengthInches: number,
  centerlineRadius: number = defaultBenderSpec().centerlineRadius,
): Kicked90Result | null {
  const geometry = calculateKicked90Geometry(
    kickAngleDeg,
    straightLengthInches,
    centerlineRadius,
  );
  if (!geometry) {
    return null;
  }
  const kickStart = geometry.arc90 + straightLengthInches;
  return {
    kickAngleDeg,
    straightLength: straightLengthInches,
    totalGain: geometry.totalGain,
    marks: [
      {
        id: 1,
        label: 'Mark 1 (start of 90° bend)',
        developedInches: 0,
        instruction: 'Tangent start of the 90° bend — reference point',
      },
      {
        id: 2,
        label: 'Mark 2 (start of kick bend)',
        developedInches: kickStart,
        instruction: 'Tangent start of the kick bend: measure developed length from Mark 1',
      },
    ],
    geometry,
  };
}
