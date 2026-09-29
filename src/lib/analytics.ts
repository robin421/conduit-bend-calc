/**
 * GA4 事件埋点（Web 端）。
 *
 * 约定：
 * - 内部只传事件类型与分类标签，绝不传用户输入值、邮箱或任何 PII。
 * - 非 Web 端或 gtag 未加载时静默 no-op，绝不抛异常。
 * - 纯函数 dispatchAnalyticsEvent 负责可测试的核心逻辑；
 *   trackEvent 是生产入口，直接读 window。
 */

import { useEffect, useRef } from 'react';

/** 事件参数：只允许分类标签，不允许输入值 / PII。 */
export type AnalyticsEventParams = Record<string, string | number>;

/** 6 个计算器的事件 slug。 */
export type CalculatorSlug =
  | 'offset'
  | 'stub'
  | 'saddle3'
  | 'saddle4'
  | 'rolling'
  | 'kicked90';

/** window.gtag 的最小形状，便于 Node 单测注入假对象。 */
export interface AnalyticsGtagTarget {
  gtag: (...args: unknown[]) => void;
}

/**
 * 可测试的核心：满足 isWeb 且 target 带可调用 gtag 时才发送。
 * 返回是否实际发送；任何异常都吞掉，返回 false。
 */
export function dispatchAnalyticsEvent(
  isWeb: boolean,
  target: unknown,
  name: string,
  params?: AnalyticsEventParams,
): boolean {
  if (!isWeb) {
    return false;
  }
  try {
    const gtag =
      typeof target === 'object' && target !== null
        ? (target as Partial<AnalyticsGtagTarget>).gtag
        : undefined;
    if (typeof gtag !== 'function') {
      return false;
    }
    gtag('event', name, params ?? {});
    return true;
  } catch {
    return false;
  }
}

/**
 * 生产入口：Web 端调用 window.gtag('event', …)，其余情况静默。
 * 绝不抛异常——埋点失败不允许影响任何业务逻辑。
 */
export function trackEvent(
  name: string,
  params?: AnalyticsEventParams,
): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    dispatchAnalyticsEvent(true, window as unknown, name, params);
  } catch {
    // 静默：埋点永不抛异常。
  }
}

/**
 * 计算器屏统一埋点：
 * - 挂载时发一次 calculator_open；
 * - 结果签名变化时发一次 calculation_completed（同一屏连续输入只记有效计算）。
 * signature 只在本地做变化检测，从不随事件发送。
 */
export function useCalculatorAnalytics(
  calculator: CalculatorSlug,
  signature: string | null,
): void {
  useEffect(() => {
    trackEvent('calculator_open', { calculator });
  }, [calculator]);

  const lastSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (signature === null || lastSentRef.current === signature) {
      return;
    }
    lastSentRef.current = signature;
    trackEvent('calculation_completed', { calculator });
  }, [calculator, signature]);
}
