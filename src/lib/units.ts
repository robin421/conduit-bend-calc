/**
 * 单位系统（P0-1 Metric 基础版）。
 *
 * 约定：内部计算一律使用英寸；metric 仅在输入解析与结果显示层做换算。
 * 纯 TypeScript，无任何运行时导入，可被 node --test 直接 import。
 */

import { formatImperial, parseImperial } from './imperial.ts';

export type UnitSystem = 'imperial' | 'metric';

/** 英寸 → 毫米 换算系数（精确值）。 */
export const MM_PER_INCH = 25.4;

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

/**
 * 解析公制长度输入为英寸数。支持：
 * - `150 mm` / `150mm` / `150`（缺省 mm）
 * - `15 cm` / `1.5 m`
 * 非法（字母、负数、0 个数字等）返回 null，不抛异常。
 */
export function parseMetric(input: string): number | null {
  if (typeof input !== 'string') {
    return null;
  }
  const text = input.trim().toLowerCase();
  if (!text || text.startsWith('-')) {
    return null;
  }
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(mm|cm|m)?$/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }
  const unit = match[2] ?? 'mm';
  const mm = unit === 'cm' ? value * 10 : unit === 'm' ? value * 1000 : value;
  return mmToInches(mm);
}

/** 按单位系统解析长度输入为英寸数。 */
export function parseLength(input: string, unit: UnitSystem): number | null {
  return unit === 'metric' ? parseMetric(input) : parseImperial(input);
}

/** 将英寸数格式化为公制字符串（mm，保留 1 位小数，整数不带小数）。 */
export function formatMetric(inches: number, fractionDigits = 1): string {
  if (!Number.isFinite(inches)) {
    return '';
  }
  const mm = inchesToMm(inches);
  const factor = 10 ** fractionDigits;
  const rounded = Math.round(mm * factor) / factor;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(fractionDigits);
  return `${text} mm`;
}

/** 按单位系统格式化长度为单字符串（imperial 已含英寸符号）。 */
export function formatLength(inches: number, unit: UnitSystem): string {
  if (unit === 'metric') {
    return formatMetric(inches);
  }
  return formatImperial(inches);
}

export interface Measurement {
  value: string;
  unit: string;
}

/**
 * 结果展示用：把英寸数拆成 value + unit，适配 ResultGroup 的 hero/row。
 * imperial：value 为 ft-in-分数（不含单位），unit 为 `"`；
 * metric：value 为 mm 数值，unit 为 `mm`。
 */
export function formatMeasurement(inches: number, unit: UnitSystem): Measurement {
  if (unit === 'metric') {
    const mm = inchesToMm(inches);
    const rounded = Math.round(mm * 10) / 10;
    const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return { value, unit: 'mm' };
  }
  const rounded = Math.round(inches * 10) / 10;
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return { value, unit: '"' };
}
