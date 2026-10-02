/**
 * Firebase Analytics + Crashlytics（仅原生端）。
 *
 * 约定（见 docs/firebase-integration-brief.md）：
 * - 零打扰：初始化在首屏渲染后由 App 的 useEffect 调用，不阻塞冷启动。
 * - Crashlytics 仅在生产（非 __DEV__）启用，避免污染线上崩溃看板。
 * - 只埋 4 个事件：screen_view / calculation_completed / unit_system_changed /
 *   pro_paywall_viewed，参数不带任何 PII。
 * - 所有调用 fire-and-forget，任何异常都吞掉，绝不影响业务逻辑。
 * - Web 端由 firebase.web.ts（Metro 平台解析）顶替，本文件不会进入 web bundle。
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import type { FirebaseAnalyticsTypes } from '@react-native-firebase/analytics';
import type { FirebaseCrashlyticsTypes } from '@react-native-firebase/crashlytics';

import type { CalculatorSlug } from './analytics.ts';

/** 与 src/lib/units.ts 的 UnitSystem 对齐（此处只用于事件参数类型）。 */
export type UnitSystemSlug = 'fractional' | 'decimal' | 'metric';

let initialized = false;

function isNative(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function getAnalytics(): FirebaseAnalyticsTypes.Module | null {
  if (!isNative()) {
    return null;
  }
  try {
    const mod = require('@react-native-firebase/analytics');
    const factory = mod?.default;
    return typeof factory === 'function' ? (factory() as FirebaseAnalyticsTypes.Module) : null;
  } catch {
    return null;
  }
}

function getCrashlytics(): FirebaseCrashlyticsTypes.Module | null {
  if (!isNative()) {
    return null;
  }
  try {
    const mod = require('@react-native-firebase/crashlytics');
    const factory = mod?.default;
    return typeof factory === 'function'
      ? (factory() as FirebaseCrashlyticsTypes.Module)
      : null;
  } catch {
    return null;
  }
}

/**
 * 初始化 Firebase。幂等；仅原生端生效。
 * Crashlytics 收集在生产启用、dev 关闭；Analytics 保持默认开启。
 * 构造 crashlytics() 会按官方实现自动接管 ErrorUtils 全局异常与未处理 Promise。
 */
export function initFirebase(): void {
  if (initialized || !isNative()) {
    return;
  }
  initialized = true;
  try {
    const crashlytics = getCrashlytics();
    void crashlytics?.setCrashlyticsCollectionEnabled(!__DEV__);
  } catch {
    // 初始化失败不影响业务。
  }
  try {
    // 触碰一次触发原生模块初始化；Analytics 收集保持默认开启。
    getAnalytics();
  } catch {
    // 初始化失败不影响业务。
  }
}

function logEvent(name: string, params?: Record<string, string>): void {
  try {
    const analytics = getAnalytics();
    if (!analytics) {
      return;
    }
    void analytics.logEvent(name, params ?? {});
  } catch {
    // 埋点永不抛异常。
  }
}

/** 自动 screen_view：由 NavigationContainer 的 onReady/onStateChange 驱动。 */
export function logFirebaseScreenView(screenName: string): void {
  try {
    const analytics = getAnalytics();
    if (!analytics) {
      return;
    }
    void analytics.logScreenView({ screen_name: screenName, screen_class: screenName });
  } catch {
    // 埋点永不抛异常。
  }
}

/** calculation_completed：bend_type 复用现有 CalculatorSlug 常量。 */
export function logFirebaseCalculationCompleted(bendType: CalculatorSlug): void {
  logEvent('calculation_completed', { bend_type: bendType });
}

/** unit_system_changed：记录切换前后的单位制。 */
export function logFirebaseUnitSystemChanged(from: UnitSystemSlug, to: UnitSystemSlug): void {
  logEvent('unit_system_changed', { from, to });
}

/** pro_paywall_viewed：Pro 解锁页展示时触发，不带参数。 */
export function logFirebaseProPaywallViewed(): void {
  logEvent('pro_paywall_viewed');
}

/**
 * 计算屏统一埋点：signature 变化时发一次 calculation_completed。
 * 与 analytics.ts 的 useCalculatorAnalytics 使用同一 signature 语义，
 * signature 只在本地做变化检测，从不随事件发送。
 */
export function useFirebaseCalculationCompleted(
  bendType: CalculatorSlug,
  signature: string | null,
): void {
  const lastSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (signature === null || lastSentRef.current === signature) {
      return;
    }
    lastSentRef.current = signature;
    logFirebaseCalculationCompleted(bendType);
  }, [bendType, signature]);
}
