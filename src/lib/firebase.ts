/**
 * Firebase Analytics + Crashlytics（仅原生端）。
 *
 * 约定（见 docs/firebase-integration-brief.md）：
 * - 零打扰：初始化在首屏渲染后由 App 的 useEffect 调用，不阻塞冷启动。
 * - Crashlytics 仅在生产（非 __DEV__）启用，避免污染线上崩溃看板。
 * - 基础事件及 T80 评分/付费分类事件见 docs/validation/t80/README.md，参数不带 PII。
 * - 所有调用 fire-and-forget，任何异常都吞掉，绝不影响业务逻辑。
 * - Web 端由 firebase.web.ts（Metro 平台解析）顶替，本文件不会进入 web bundle。
 */

import { Platform } from 'react-native';

import type { FirebaseAnalyticsTypes } from '@react-native-firebase/analytics';
import type { FirebaseCrashlyticsTypes } from '@react-native-firebase/crashlytics';

import { logAmplitudeEvent, trackAmplitudeActivationIfNeeded } from './amplitude';
import { normalizeToolName, type CalculatorSlug } from './analytics.ts';
import type { GrowthEvent, GrowthEventParams } from './growthEvents';
import { loadConfiguredFirebaseModule } from './firebaseModule';
import { useDebouncedCalculationCompleted } from './useDebouncedCalculationCompleted';

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
    const mod = loadConfiguredFirebaseModule(
      () => require('@react-native-firebase/app').getApps(),
      () => require('@react-native-firebase/analytics'),
    );
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
    const mod = loadConfiguredFirebaseModule(
      () => require('@react-native-firebase/app').getApps(),
      () => require('@react-native-firebase/crashlytics'),
    );
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
    void crashlytics?.setCrashlyticsCollectionEnabled(!__DEV__).catch(() => undefined);
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
    void analytics.logEvent(name, params ?? {}).catch(() => undefined);
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
    void analytics.logScreenView({ screen_name: screenName, screen_class: screenName }).catch(() => undefined);
  } catch {
    // 埋点永不抛异常。
  }
}

/** calculation_completed：统一 tool_name / unit_system / platform 规范。 */
export function logFirebaseCalculationCompleted(
  bendType: CalculatorSlug,
  options?: { unitSystem?: 'imperial' | 'metric' },
): void {
  const platform = Platform.OS === 'web' ? 'web' : (Platform.OS === 'android' ? 'android' : 'ios');
  const unitSystem = options?.unitSystem ?? 'imperial';
  const toolName = normalizeToolName(bendType);
  const props = {
    bend_type: bendType,
    tool_name: toolName,
    unit_system: unitSystem,
    platform,
  };
  logEvent('calculation_completed', props);
  logAmplitudeEvent('calculation_completed', props);
  trackAmplitudeActivationIfNeeded({
    tool_name: toolName,
    unit_system: unitSystem,
    platform,
  });
}

/** unit_system_changed：记录切换前后的单位制。 */
export function logFirebaseUnitSystemChanged(from: UnitSystemSlug, to: UnitSystemSlug): void {
  logEvent('unit_system_changed', { from, to });
  logAmplitudeEvent('unit_system_changed', { from, to });
}

/** pro_paywall_viewed：Pro 解锁页展示时触发，支持携带触发来源。 */
export function logFirebaseProPaywallViewed(triggerSource = 'direct'): void {
  logEvent('pro_paywall_viewed', { trigger_source: triggerSource });
  logAmplitudeEvent('pro_paywall_viewed', { trigger_source: triggerSource });
}

export function logFirebaseGrowthEvent(name: GrowthEvent, params: GrowthEventParams): void {
  logEvent(name, { ...params });
}

/**
 * 计算屏统一埋点：signature 变化时经 1000ms 防抖发一次 calculation_completed。
 * 组件卸载时若存在未上报计算立即 flush。
 * 与 analytics.ts 的 useCalculatorAnalytics 使用同一 signature 语义，
 * signature 只在本地做变化检测，从不随事件发送。
 */
export function useFirebaseCalculationCompleted(
  bendType: CalculatorSlug,
  signature: string | null,
  options?: { unitSystem?: 'imperial' | 'metric' },
): void {
  const unitSystem = options?.unitSystem ?? 'imperial';
  useDebouncedCalculationCompleted(bendType, signature, unitSystem, logFirebaseCalculationCompleted);
}
