/**
 * Firebase Analytics + Crashlytics 的 Web 端实现：
 *
 * Metro 在 web 平台解析 ./firebase 时优先选用本文件，确保原生 Firebase SDK
 * 不进入 web bundle；同时将核心计算、单位切换与付费墙事件同步上报至 Amplitude（纯 HTTP，零原生依赖）。
 */

import { logAmplitudeEvent, trackAmplitudeActivationIfNeeded } from './amplitude';
import { normalizeToolName, type CalculatorSlug } from './analytics.ts';
import type { ProPaywallViewedParams, UnitSystemSlug } from './firebase.ts';
import type { GrowthEvent, GrowthEventParams } from './growthEvents';
import { useDebouncedCalculationCompleted } from './useDebouncedCalculationCompleted';

export type { ProPaywallViewedParams, UnitSystemSlug };

export function initFirebase(): void {}

export function logFirebaseScreenView(_screenName: string): void {}

export function logFirebaseCalculationCompleted(
  bendType: CalculatorSlug,
  options?: { unitSystem?: 'imperial' | 'metric'; unitMode?: UnitSystemSlug },
): void {
  const unitSystem = options?.unitSystem ?? (options?.unitMode === 'metric' ? 'metric' : 'imperial');
  const unitMode: UnitSystemSlug = options?.unitMode ?? (unitSystem === 'metric' ? 'metric' : 'fractional');
  const toolName = normalizeToolName(bendType);
  logAmplitudeEvent('calculation_completed', {
    bend_type: bendType,
    tool_name: toolName,
    unit_system: unitSystem,
    unit_mode: unitMode,
    platform: 'web',
  });
  trackAmplitudeActivationIfNeeded({
    tool_name: toolName,
    unit_system: unitSystem,
    unit_mode: unitMode,
    platform: 'web',
  });
}

export function logFirebaseUnitSystemChanged(
  from: UnitSystemSlug,
  to: UnitSystemSlug,
): void {
  logAmplitudeEvent('unit_system_changed', { from, to });
}

export function logFirebaseProPaywallViewed(
  triggerSource = 'direct',
  extra?: ProPaywallViewedParams,
): void {
  logAmplitudeEvent('pro_paywall_viewed', {
    trigger_source: triggerSource,
    ...(extra?.scene ? { scene: extra.scene } : {}),
    ...(extra?.sku_status ? { sku_status: extra.sku_status } : {}),
    ...(extra?.price_loaded !== undefined ? { price_loaded: extra.price_loaded } : {}),
  });
}

export function logFirebaseGrowthEvent(_name: GrowthEvent, _params: GrowthEventParams): void {}

export function useFirebaseCalculationCompleted(
  bendType: CalculatorSlug,
  signature: string | null,
  options?: { unitSystem?: 'imperial' | 'metric'; unitMode?: UnitSystemSlug },
): void {
  const unitSystem = options?.unitSystem ?? (options?.unitMode === 'metric' ? 'metric' : 'imperial');
  useDebouncedCalculationCompleted(
    bendType,
    signature,
    unitSystem,
    logFirebaseCalculationCompleted,
    options?.unitMode,
  );
}
