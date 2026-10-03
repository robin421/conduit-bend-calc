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

/** 计算器的事件 slug（含 SEO `/shrink` 工具页）。 */
export type CalculatorSlug =
  | 'offset'
  | 'stub'
  | 'saddle3'
  | 'saddle4'
  | 'rolling'
  | 'kicked90'
  | 'shrink';

/**
 * SEO 工具页的 GA4 `tool_name` 口径（与内部 key 不同）：
 * offset / 4-point-saddle / shrink / stub-up。
 */
export type SeoToolName =
  | 'offset'
  | '4-point-saddle'
  | 'shrink'
  | 'stub-up';

/**
 * GA4 Measurement ID 为 `G-Z6L51MPY1J`，但**不在此文件硬编码**：
 * gtag.js 基础代码由构建期脚本 scripts/inject-web-seo.py 注入
 * （`--ga4-id G-Z6L51MPY1J` 或 `GA4_ID` 环境变量），见 CHANGELOG 构建流程。
 * 本模块只负责在 gtag 已就绪时分发事件。
 */

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

/* ------------------------------------------------------------------ */
/* SEO 工具页专用事件                                                   */
/* ------------------------------------------------------------------ */

/** calculate：SEO 工具页产出有效结果时触发。 */
export function trackSeoToolCalculate(toolName: SeoToolName): void {
  trackEvent('calculate', { tool_name: toolName });
}

/** unit_change：SEO 工具页切换单位制。 */
export function trackSeoToolUnitChange(
  toolName: SeoToolName,
  from: string,
  to: string,
): void {
  trackEvent('unit_change', { from, to, tool_name: toolName });
}

/** faq_expand：SEO 工具页展开某条 FAQ。 */
export function trackSeoToolFaqExpand(
  toolName: SeoToolName,
  question: string,
): void {
  trackEvent('faq_expand', { question, tool_name: toolName });
}

/** internal_link_click："More Free Tools" 内链点击。 */
export function trackInternalLinkClick(from: string, to: string): void {
  trackEvent('internal_link_click', { from, to });
}

/**
 * SEO 工具页的 calculate 埋点：signature 变化（说明用户输入已形成有效结果）
 * 时发一次 `calculate`，同一结果不重复发送。signature 从不随事件发送。
 */
export function useSeoToolCalculateAnalytics(
  toolName: SeoToolName,
  signature: string | null,
): void {
  const lastSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (signature === null || lastSentRef.current === signature) {
      return;
    }
    lastSentRef.current = signature;
    trackSeoToolCalculate(toolName);
  }, [toolName, signature]);
}
