import {
  FILL_LIMITS,
  FILL_ROUND_UP_FRACTION,
  RACEWAY_AREA_SQIN,
  THHN_AREA_SQIN,
} from '../../constants.ts';
import type { RacewayType, TradeSize, WireSize } from '../../constants.ts';

const EPS = 1e-9;

/** Chapter 9 Table 1：按根数取允许填充率。 */
export function allowedFillFraction(count: number): number {
  if (count === 1) return FILL_LIMITS.one;
  if (count === 2) return FILL_LIMITS.two;
  return FILL_LIMITS.overTwo;
}

/**
 * 同规格 THHN/THWN 导线在该管内的最多根数（Chapter 9 Table 1 + Note 7）。
 * 规格不存在时返回 null，不抛异常。
 */
export function maxSameSizeConductors(raceway: RacewayType, trade: TradeSize, wire: WireSize): number | null {
  const area = RACEWAY_AREA_SQIN[raceway]?.[trade];
  const wireArea = THHN_AREA_SQIN[wire];
  if (!area || !wireArea) return null;
  const raw = (FILL_LIMITS.overTwo * area) / wireArea;
  let n = Math.floor(raw + EPS);
  if (raw - n >= FILL_ROUND_UP_FRACTION - EPS) n += 1;
  if (n > 2) return n;
  if (2 * wireArea <= FILL_LIMITS.two * area + EPS) return 2;
  if (wireArea <= FILL_LIMITS.one * area + EPS) return 1;
  return 0;
}

export interface ConduitFillResult {
  /** 最多根数 */
  maxConductors: number;
  /** 管内总截面积（in²） */
  racewayAreaSqIn: number;
  /** 单根导线截面积（in²） */
  wireAreaSqIn: number;
  /** 用户输入根数时：实际填充率（0–1） */
  fillFraction?: number;
  /** 用户输入根数时：该根数对应的允许填充率（0–1） */
  allowedFraction?: number;
  /** 用户输入根数是否符合规范 */
  fits?: boolean;
}

/**
 * 导管填充计算。count 可选（正整数）；非法输入返回 null。
 */
export function calculateConduitFill(
  raceway: RacewayType,
  trade: TradeSize,
  wire: WireSize,
  count?: number,
): ConduitFillResult | null {
  const max = maxSameSizeConductors(raceway, trade, wire);
  if (max === null) return null;
  const racewayAreaSqIn = RACEWAY_AREA_SQIN[raceway][trade];
  const wireAreaSqIn = THHN_AREA_SQIN[wire];
  const result: ConduitFillResult = { maxConductors: max, racewayAreaSqIn, wireAreaSqIn };
  if (count === undefined) return result;
  if (!Number.isInteger(count) || count < 1 || count > 999) return null;
  result.fillFraction = (count * wireAreaSqIn) / racewayAreaSqIn;
  result.allowedFraction = allowedFillFraction(count);
  result.fits = count <= max;
  return result;
}
