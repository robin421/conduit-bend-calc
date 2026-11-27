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
  /** null = 未给定起点（App 计算器只算间距，不算绝对标记位置）。 */
  mark1: number | null;
  mark2: number | null;
  unit: UnitSystem;
}

export function buildOffsetCopyText(data: OffsetCopyData): string {
  const head =
    `Offset at ${data.angle}°: mark spacing ${len(data.spacing, data.unit)}, ` +
    `shrink ${len(data.shrink, data.unit)}`;
  if (data.mark1 === null) return `${head}.`;
  const base = `${head}. Mark 1 at ${len(data.mark1, data.unit)}`;
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
  return `90° stub in ${data.sizeLabel}: mark the conduit at ${len(data.mark, data.unit)} from the end (${len(data.takeUp, data.unit)} take-up).`;
}

export interface ThreePointSaddleCopyData {
  centerAngle: OffsetAngle;
  sideSpacing: number;
  span: number;
  shrink: number;
  unit: UnitSystem;
}

export function buildThreePointSaddleCopyText(data: ThreePointSaddleCopyData): string {
  const sideAngle = data.centerAngle / 2;
  return (
    `3-point saddle (${data.centerAngle}° center / ${sideAngle}° sides): ` +
    `side marks ${len(data.sideSpacing, data.unit)} from center, ` +
    `total span ${len(data.span, data.unit)}, center shrink ${len(data.shrink, data.unit)}.`
  );
}

export interface ConduitFillCopyData {
  racewayLabel: string;
  tradeSize: string;
  wireLabel: string;
  maxConductors: number;
  count?: number;
  fillPercent?: number;
  allowedPercent?: number;
  fits?: boolean;
}

export function buildConduitFillCopyText(data: ConduitFillCopyData): string {
  const base =
    `NEC Conduit Fill (${data.tradeSize}" ${data.racewayLabel}, ${data.wireLabel} THHN): ` +
    `max ${data.maxConductors} wires`;
  if (
    data.count !== undefined &&
    data.fillPercent !== undefined &&
    data.allowedPercent !== undefined
  ) {
    const status = data.fits === false ? 'OVERFILLED' : 'OK';
    return `${base}. ${data.count} wires = ${data.fillPercent.toFixed(1)}% fill (limit ${data.allowedPercent}%, ${status}).`;
  }
  return `${base}.`;
}

export interface RollingOffsetCopyData {
  angle: OffsetAngle;
  trueOffset: number;
  spacing: number;
  shrink: number;
  rollAngleDeg: number;
  unit: UnitSystem;
}

export function buildRollingOffsetCopyText(data: RollingOffsetCopyData): string {
  const rot = Math.round(data.rollAngleDeg * 10) / 10;
  return (
    `Rolling offset at ${data.angle}°: mark spacing ${len(data.spacing, data.unit)}, ` +
    `true offset ${len(data.trueOffset, data.unit)}, shrink ${len(data.shrink, data.unit)}, ` +
    `rotation ${rot}°. `
  ).trim();
}

export interface Kicked90CopyData {
  sizeLabel: string;
  stubMark: number;
  takeUp: number;
  kickAngle: OffsetAngle;
  kickMarkFromBack: number;
  totalGain: number;
  unit: UnitSystem;
}

export function buildKicked90CopyText(data: Kicked90CopyData): string {
  return (
    `Kicked 90° in ${data.sizeLabel} (${data.kickAngle}° kick): ` +
    `kick mark ${len(data.kickMarkFromBack, data.unit)} from back of 90°, ` +
    `stub mark ${len(data.stubMark, data.unit)} from end (${data.takeUp}" take-up), ` +
    `total gain ${len(data.totalGain, data.unit)}.`
  );
}

export interface WireSizeCopyData {
  metalLabel: string;
  wireLabel: string;
  amps: number;
  requiredAmps: number;
  continuous: boolean;
  column: number;
  ampacity: number;
}

export function buildWireSizeCopyText(data: WireSizeCopyData): string {
  const contNote = data.continuous ? ` (×125% = ${data.requiredAmps} A)` : '';
  return (
    `NEC Wire Size (${data.amps} A${contNote}, ${data.metalLabel}, ${data.column}°C): ` +
    `minimum ${data.wireLabel} (${data.ampacity} A ampacity per Table 310.16).`
  );
}

export interface VoltageDropCopyData {
  phase: 1 | 3;
  volts: number;
  amps: number;
  distance: number;
  distanceUnit: 'ft' | 'm';
  metalLabel: string;
  wireLabel: string;
  dropPercent: number;
  dropVolts: number;
  endVolts: number;
  limitPercent: number;
  recommendedWire?: string | null;
}

export function buildVoltageDropCopyText(data: VoltageDropCopyData): string {
  const phaseLabel = data.phase === 3 ? '3φ' : '1φ';
  const base =
    `NEC Voltage Drop (${phaseLabel} ${data.volts}V, ${data.amps} A, ${data.distance} ${data.distanceUnit}, ` +
    `${data.wireLabel} ${data.metalLabel}): ${data.dropPercent.toFixed(2)}% ` +
    `(${data.dropVolts.toFixed(2)} V drop, ${data.endVolts.toFixed(1)} V at load)`;
  if (data.dropPercent > data.limitPercent) {
    return data.recommendedWire
      ? `${base} — OVER ${data.limitPercent}% limit (use ${data.recommendedWire}).`
      : `${base} — OVER ${data.limitPercent}% limit.`;
  }
  return `${base} — OK (≤${data.limitPercent}%).`;
}
