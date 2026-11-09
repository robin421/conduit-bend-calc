/**
 * GA4 事件埋点（Web 端）。
 *
 * 约定：
 * - 内部只传事件类型与分类标签，绝不传用户输入值、邮箱或任何 PII。
 * - 非 Web 端或 gtag 未加载时静默 no-op，绝不抛异常。
 * - 纯函数 dispatchAnalyticsEvent 负责可测试的核心逻辑；
 *   trackEvent 是生产入口，直接读 window。
 */

import { useCallback, useEffect, useRef } from 'react';

/** 事件参数：只允许分类标签，不允许输入值 / PII。 */
export type AnalyticsEventParams = Record<string, string | number>;

/** 计算器的事件 slug（含 SEO `/shrink` 工具页及新电工工具）。 */
export type CalculatorSlug =
  | 'offset'
  | 'stub'
  | 'saddle3'
  | 'saddle4'
  | 'rolling'
  | 'kicked90'
  | 'conduit_fill'
  | 'voltage_drop'
  | 'wire_sizing'
  | 'shrink';

/** 统一的规范化工具名称。 */
export type ToolName =
  | 'stub'
  | 'offset'
  | 'three_point_saddle'
  | 'four_point_saddle'
  | 'rolling_offset'
  | 'kicked_90'
  | 'conduit_fill'
  | 'voltage_drop'
  | 'wire_sizing'
  | 'shrink';

/** 将各种内部 slug 规范化为统一的 tool_name */
export function normalizeToolName(slug: CalculatorSlug | string): ToolName {
  switch (slug) {
    case 'stub':
      return 'stub';
    case 'offset':
      return 'offset';
    case 'saddle3':
    case 'threePointSaddle':
      return 'three_point_saddle';
    case 'saddle4':
    case 'fourPointSaddle':
      return 'four_point_saddle';
    case 'rolling':
    case 'rollingOffset':
      return 'rolling_offset';
    case 'kicked90':
      return 'kicked_90';
    case 'conduitFill':
    case 'conduit_fill':
      return 'conduit_fill';
    case 'voltageDrop':
    case 'voltage_drop':
      return 'voltage_drop';
    case 'wireSize':
    case 'wire_sizing':
      return 'wire_sizing';
    case 'shrink':
      return 'shrink';
    default:
      return slug as ToolName;
  }
}

/** 获取当前端平台标识（纯 JS 实现，不依赖 react-native，可安全在 Node 单测中运行） */
export function getAnalyticsPlatform(customPlatform?: string): 'web' | 'android' | 'ios' {
  if (customPlatform === 'android' || customPlatform === 'ios' || customPlatform === 'web') {
    return customPlatform;
  }
  if (typeof window !== 'undefined') {
    return 'web';
  }
  const globalAny = globalThis as { Platform?: { OS?: string } };
  if (globalAny.Platform?.OS === 'android') return 'android';
  if (globalAny.Platform?.OS === 'ios') return 'ios';
  return 'web';
}

/** 判断是否为本地开发环境 */
export function isLocalDevEnvironment(): boolean {
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      return true;
    }
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local') || host === '0.0.0.0') {
        return true;
      }
    }
  } catch {
    // 忽略异常
  }
  return false;
}

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
 * 本地开发环境（__DEV__ / localhost）自动屏蔽真实请求并打印 debug 日志。
 */
export function trackEvent(
  name: string,
  params?: AnalyticsEventParams,
): void {
  try {
    if (isLocalDevEnvironment()) {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug('[analytics:dev]', name, params);
      }
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    dispatchAnalyticsEvent(true, window as unknown, name, params);
  } catch {
    // 静默：埋点永不抛异常。
  }
}

export interface CalculatorAnalyticsOptions {
  unitSystem?: 'imperial' | 'metric';
  platform?: 'web' | 'android' | 'ios';
}

/**
 * 计算器屏统一埋点：
 * - 挂载时发一次 calculator_open；
 * - 结果签名变化时经 1000ms 防抖发一次 calculation_completed（同一屏连续输入只记有效计算）；
 * - 组件卸载时若存在未上报计算则立即 flush，防止用户秒退丢失数据。
 * signature 只在本地做变化检测，从不随事件发送。
 */
export function useCalculatorAnalytics(
  calculator: CalculatorSlug,
  signature: string | null,
  options?: CalculatorAnalyticsOptions,
): void {
  useEffect(() => {
    trackEvent('calculator_open', {
      calculator,
      tool_name: normalizeToolName(calculator),
      platform: getAnalyticsPlatform(options?.platform),
    });
  }, [calculator, options?.platform]);

  const lastSentRef = useRef<string | null>(null);
  const pendingRef = useRef<{
    signature: string;
    calculator: CalculatorSlug;
    unitSystem: 'imperial' | 'metric';
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unitSystem = options?.unitSystem ?? 'imperial';

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending && pending.signature && pending.signature !== lastSentRef.current) {
      lastSentRef.current = pending.signature;
      trackEvent('calculation_completed', {
        calculator: pending.calculator,
        bend_type: pending.calculator,
        tool_name: normalizeToolName(pending.calculator),
        unit_system: pending.unitSystem,
        platform: getAnalyticsPlatform(options?.platform),
      });
      pendingRef.current = null;
    }
  }, [options?.platform]);

  useEffect(() => {
    if (signature === null || signature === lastSentRef.current) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current = null;
      return;
    }

    pendingRef.current = { signature, calculator, unitSystem };

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      flush();
    }, 1000);
  }, [calculator, signature, unitSystem, flush]);

  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);
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

/** preset_apply：SEO 工具页点常用预设（角度 / 管径）。 */
export function trackSeoToolPreset(toolName: SeoToolName, preset: string): void {
  trackEvent('preset_apply', { preset, tool_name: toolName });
}

/** copy_result：SEO 工具页一键复制结果（success 只记是否成功，不记内容）。 */
export function trackSeoToolCopy(toolName: SeoToolName, success: boolean): void {
  trackEvent('copy_result', { success: success ? 1 : 0, tool_name: toolName });
}

/** history_refill：SEO 工具页点历史条目回填。 */
export function trackSeoToolHistoryRefill(toolName: SeoToolName): void {
  trackEvent('history_refill', { tool_name: toolName });
}

/**
 * SEO 工具页的 calculate 埋点：signature 变化（说明用户输入已形成有效结果）
 * 经 1000ms 防抖发一次 `calculate`，组件卸载时 flush 未发送的计算，同一结果不重复发送。
 * signature 从不随事件发送。
 */
export function useSeoToolCalculateAnalytics(
  toolName: SeoToolName,
  signature: string | null,
): void {
  const lastSentRef = useRef<string | null>(null);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current && pendingRef.current !== lastSentRef.current) {
      lastSentRef.current = pendingRef.current;
      trackSeoToolCalculate(toolName);
      pendingRef.current = null;
    }
  }, [toolName]);

  useEffect(() => {
    if (signature === null || signature === lastSentRef.current) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current = null;
      return;
    }
    pendingRef.current = signature;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      flush();
    }, 1000);
  }, [signature, flush]);

  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);
}
