/**
 * 结果一键复制文案（纯函数，可被 node --test 直接 import）。
 *
 * 目标：拼成一句能在微信 / 备忘录里直接读懂的自然英文，
 * 徒弟拿到不用再问「这是啥」。所有长度经 formatLength 按当前单位制格式化，
 * 保证复制出来的文本和屏幕上的数字完全一致。
 */

import type { OffsetAngle } from '../constants.ts';
import { formatLength, type UnitSystem } from './units.ts';
import type { ShrinkMode } from './seoHistory.ts';

function len(inches: number, unit: UnitSystem): string {
  const text = formatLength(inches, unit);
  return text === '' ? `${inches}"` : text;
}

export interface OffsetCopyData {
  angle: OffsetAngle;
  spacing: number;
  shrink: number;
  mark1: number;
  mark2: number | null;
  unit: UnitSystem;
}

export function buildOffsetCopyText(data: OffsetCopyData): string {
  const base =
    `Offset at ${data.angle}°: mark spacing ${len(data.spacing, data.unit)}, ` +
    `shrink ${len(data.shrink, data.unit)}. Mark 1 at ${len(data.mark1, data.unit)}`;
  return data.mark2 !== null
    ? `${base}, mark 2 at ${len(data.mark2, data.unit)}.`
    : `${base}.`;
}

export interface SaddleCopyData {
  angle: OffsetAngle;
  markSpacing: number;
  span: number;
  totalShrink: number | null;
  unit: UnitSystem;
}

export function buildSaddleCopyText(data: SaddleCopyData): string {
  const base =
    `4-point saddle at ${data.angle}°: mark spacing ${len(data.markSpacing, data.unit)}, ` +
    `total span ${len(data.span, data.unit)}`;
  return data.totalShrink !== null
    ? `${base}, total shrink ${len(data.totalShrink, data.unit)}.`
    : `${base}.`;
}

export interface ShrinkCopyData {
  mode: ShrinkMode;
  angle: OffsetAngle;
  shrink: number;
  unit: UnitSystem;
}

export function buildShrinkCopyText(data: ShrinkCopyData): string {
  const label = data.mode === 'saddle' ? '4-point saddle shrink' : 'offset shrink';
  return `${label} at ${data.angle}°: ${len(data.shrink, data.unit)}.`;
}

export interface StubCopyData {
  sizeLabel: string;
  takeUp: number;
  mark: number;
  unit: UnitSystem;
}

export function buildStubCopyText(data: StubCopyData): string {
  return `90° stub in ${data.sizeLabel}: mark the conduit at ${len(data.mark, data.unit)} from the end (${data.takeUp}" take-up).`;
}
