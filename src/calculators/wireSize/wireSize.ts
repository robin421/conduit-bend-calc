import {
  AMPACITY_310_16,
  CONTINUOUS_LOAD_FACTOR,
  SMALL_CONDUCTOR_MAX_OCPD,
  TEMP_COLUMNS,
  WIRE_SIZES,
} from '../../constants.ts';
import type { ConductorMetal, TempColumn, WireSize } from '../../constants.ts';

export interface WireSizeInput {
  metal: ConductorMetal;
  /** 负载电流（A） */
  amps: number;
  /** 连续负载（≥3 小时）按 125% 选线 */
  continuous: boolean;
  /** 端子温度等级；不传时按 110.14(C)(1)：≤100 A 取 60°C，>100 A 取 75°C */
  column?: TempColumn;
}

export interface WireSizeResult {
  size: WireSize;
  /** 所选列的载流量（A） */
  ampacity: number;
  /** 选线依据电流（含 125%） */
  requiredAmps: number;
  column: TempColumn;
  /** 是否因 240.4(D) 小导线规则加大了一档以上 */
  smallConductorRuleApplied: boolean;
}

/** 110.14(C)(1) 默认端子温度列。 */
export function defaultTempColumn(requiredAmps: number): TempColumn {
  return requiredAmps <= 100 ? 60 : 75;
}

/**
 * 最小导线规格（Table 310.16，不含环境温度和根数校正）。
 * 表内最大规格也不够时返回 null；非法输入返回 null。
 */
export function calculateWireSize(input: WireSizeInput): WireSizeResult | null {
  const { metal, amps, continuous } = input;
  if (!Number.isFinite(amps) || amps <= 0 || amps > 2000) return null;
  const requiredAmps = continuous ? amps * CONTINUOUS_LOAD_FACTOR : amps;
  const column = input.column ?? defaultTempColumn(requiredAmps);
  const idx = TEMP_COLUMNS.indexOf(column);
  if (idx < 0) return null;
  let blockedBySmallRule = false;
  for (const size of WIRE_SIZES) {
    const row = AMPACITY_310_16[metal]?.[size];
    if (!row) continue;
    if (row[idx] + 1e-9 < requiredAmps) continue;
    const maxOcpd = SMALL_CONDUCTOR_MAX_OCPD[metal]?.[size];
    if (maxOcpd !== undefined && requiredAmps > maxOcpd + 1e-9) {
      blockedBySmallRule = true;
      continue;
    }
    return { size, ampacity: row[idx], requiredAmps, column, smallConductorRuleApplied: blockedBySmallRule };
  }
  return null;
}
