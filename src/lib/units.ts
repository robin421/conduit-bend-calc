/**
 * 单位系统（P0-1 Metric 基础版）。
 *
 * 约定：内部计算一律使用英寸；metric 仅在输入解析与结果显示层做换算。
 * 纯 TypeScript，无任何运行时导入，可被 node --test 直接 import。
 */

import { formatDecimalInches, formatImperial, parseImperial } from './imperial.ts';

export type UnitSystem = 'fractional' | 'decimal' | 'metric';

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

/**
 * 单位切换时清理输入框残留的旧单位符号。
 * - 空白输入原样返回（保持未填写状态）。
 * - 新单位能直接解析的原样返回（纯数字或带新单位符号的都无需处理）。
 * - 否则剥离所有长度单位符号（`"` `″` `'` `ft` `in` `mm` `cm` `m` 等），
 *   剥离后能解析则返回剥离后的文本（只留数字部分）；
 *   仍无法解析则返回空字符串（清空该框，不留报错状态）。
 * 纯函数，可被 node --test 直接 import。
 */
export function sanitizeInputForUnit(value: string, unit: UnitSystem): string {
  if (typeof value !== 'string') {
    return '';
  }
  if (value.trim() === '') {
    return value;
  }
  if (parseLength(value, unit) !== null) {
    return value;
  }
  const stripped = value
    .replace(/[‘’‚‛′″“”«»"'`]/g, ' ')
    .replace(/(feet|foot|ft|inches|inch|in|mm|cm|m)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped === '' || parseLength(stripped, unit) === null) {
    return '';
  }
  return stripped;
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

/** 按单位系统格式化长度为单字符串（含单位符号）。 */
export function formatLength(inches: number, unit: UnitSystem): string {
  if (unit === 'metric') {
    return formatMetric(inches);
  }
  if (unit === 'decimal') {
    const text = formatDecimalInches(inches);
    return text === '' ? '' : `${text}"`;
  }
  return formatImperial(inches);
}

export interface Measurement {
  value: string;
  unit: string;
}

/**
 * 结果展示用：把英寸数拆成 value + unit，适配 ResultGroup 的 hero/row。
 * fractional：value 为 ft-in-分数（含符号），unit 为空；
 * decimal：value 为去尾零小数，unit 为 `"`；
 * metric：value 为 mm 数值，unit 为 `mm`。
 */
export function formatMeasurement(inches: number, unit: UnitSystem): Measurement {
  if (unit === 'metric') {
    const mm = inchesToMm(inches);
    const rounded = Math.round(mm * 10) / 10;
    const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return { value, unit: 'mm' };
  }
  if (unit === 'decimal') {
    return { value: formatDecimalInches(inches), unit: '"' };
  }
  return { value: formatImperial(inches), unit: '' };
}

/**
 * 将内部英寸数格式化为适合输入框显示的文本。
 * - metric：四舍五入为整数 mm 字符串（例如 12" → `305`）。
 * - decimal：去尾零小数英寸（例如 `12`、`6.5`）。
 * - fractional：规范化分数英寸（例如 `12"`、`6 1/2"`）。
 */
export function formatInputValueForUnit(inches: number, unit: UnitSystem): string {
  if (!Number.isFinite(inches) || inches <= 0) {
    return '';
  }
  if (unit === 'metric') {
    const mm = inchesToMm(inches);
    const rounded = Math.round(mm);
    return String(rounded > 0 ? rounded : 1);
  }
  if (unit === 'decimal') {
    return formatDecimalInches(inches);
  }
  const imperial = formatImperial(inches);
  return imperial && imperial !== '0"' ? imperial : formatDecimalInches(inches);
}

/**
 * 单位切换时将当前输入框中的合法数值从旧单位换算到新单位（inch ↔ mm）。
 * - 空白输入或同单位切换原样返回。
 * - 合法正数按实际物理长度换算。
 * - 非法或非正数回退到 sanitizeInputForUnit。
 */
export function convertLengthInputText(
  text: string,
  fromUnit: UnitSystem,
  toUnit: UnitSystem,
): string {
  if (typeof text !== 'string' || fromUnit === toUnit || text.trim() === '') {
    return text;
  }
  const inches = parseLength(text, fromUnit);
  if (inches === null || !Number.isFinite(inches) || inches <= 0) {
    return sanitizeInputForUnit(text, toUnit);
  }
  return formatInputValueForUnit(inches, toUnit);
}
