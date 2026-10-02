/**
 * Firebase Analytics + Crashlytics 的 Web 端 no-op 实现。
 *
 * Metro 在 web 平台解析 ./firebase 时优先选用本文件，确保原生 Firebase SDK
 * 不进入 web bundle。所有导出与 firebase.ts 保持同签名。
 */

import type { CalculatorSlug } from './analytics.ts';
import type { UnitSystemSlug } from './firebase.ts';

export type { UnitSystemSlug };

export function initFirebase(): void {}

export function logFirebaseScreenView(_screenName: string): void {}

export function logFirebaseCalculationCompleted(_bendType: CalculatorSlug): void {}

export function logFirebaseUnitSystemChanged(
  _from: UnitSystemSlug,
  _to: UnitSystemSlug,
): void {}

export function logFirebaseProPaywallViewed(): void {}

export function useFirebaseCalculationCompleted(
  _bendType: CalculatorSlug,
  _signature: string | null,
): void {}
