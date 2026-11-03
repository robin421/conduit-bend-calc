import { DC_RESISTANCE_OHM_PER_KFT, WIRE_SIZES } from '../../constants.ts';
import type { ConductorMetal, WireSize } from '../../constants.ts';

export type Phase = 1 | 3;

export interface VoltageDropInput {
  metal: ConductorMetal;
  size: WireSize;
  /** 负载电流（A） */
  amps: number;
  /** 单程长度（ft） */
  lengthFt: number;
  /** 系统电压（V） */
  volts: number;
  phase: Phase;
}

export interface VoltageDropResult {
  dropVolts: number;
  /** 0–1 */
  dropFraction: number;
  endVolts: number;
}

function valid(n: number, max: number): boolean {
  return Number.isFinite(n) && n > 0 && n <= max;
}

/**
 * 电压降（Chapter 9 Table 8 直流电阻法）：
 * 单相 VD = 2·L·R·I / 1000，三相 VD = √3·L·R·I / 1000（L 为单程英尺）。
 * 忽略电抗；大线径交流回路误差变大，界面提示。非法输入返回 null。
 */
export function calculateVoltageDrop(input: VoltageDropInput): VoltageDropResult | null {
  const { metal, size, amps, lengthFt, volts, phase } = input;
  const r = DC_RESISTANCE_OHM_PER_KFT[metal]?.[size];
  if (r === undefined || !valid(amps, 5000) || !valid(lengthFt, 100000) || !valid(volts, 1000)) return null;
  if (phase !== 1 && phase !== 3) return null;
  const factor = phase === 3 ? Math.sqrt(3) : 2;
  const dropVolts = (factor * lengthFt * r * amps) / 1000;
  return { dropVolts, dropFraction: dropVolts / volts, endVolts: volts - dropVolts };
}

/** 电压降不超过 limit（0–1）的最小线径；表内都不满足返回 null。 */
export function smallestSizeWithinDrop(
  input: Omit<VoltageDropInput, 'size'>,
  limit: number,
): WireSize | null {
  for (const size of WIRE_SIZES) {
    const res = calculateVoltageDrop({ ...input, size });
    if (res && res.dropFraction <= limit + 1e-12) return size;
  }
  return null;
}
