/**
 * 计算器切换条数据（纯数据模块，可被 node --test 直接 import）。
 *
 * 单一来源：路由 / 屏幕名来自 `toolPages.ts` + `seoRoutes.ts`，
 * 切换条的条目顺序与短标签在此集中定义，屏幕只负责渲染。
 *
 * 约束（brief III）：不改 URL 结构。因此切换条只收录已有 Web 路由的
 * 交互式工具页，外加回首页（`/`，首页聚合了 Kick / 3-Point / Rolling 等
 * 原生计算器）。不存在的路由一律不放进列表，避免死链。
 */

import type { SeoScreenName } from '../navigation/seoRoutes.ts';
import { SEO_TOOL_SCREENS } from '../navigation/seoRoutes.ts';
import { SEO_TOOL_PAGES, type SeoToolKey } from './toolPages.ts';

export interface CalculatorNavItem {
  /** 稳定 key（工具页用 SeoToolKey，首页用 'home'）。 */
  key: string;
  /** 切换条上的短标签。 */
  label: string;
  /** SPA 内路由（首页为 `/`）。 */
  path: string;
  /** React Navigation screen 名。 */
  screen: SeoScreenName | 'RootTabs';
}

/** 工具页在切换条上的短标签（页面 h1 太长，不适合芯片）。 */
const SHORT_LABELS: Record<SeoToolKey, string> = {
  offset: 'Offset',
  saddle4: '4-Point Saddle',
  shrink: 'Shrink',
  stubUp: '90° Stub',
};

/** 4 个交互式工具页 + 回首页入口。顺序即切换条展示顺序。 */
export const CALCULATOR_NAV: readonly CalculatorNavItem[] = [
  ...SEO_TOOL_PAGES.map((page) => ({
    key: page.key as string,
    label: SHORT_LABELS[page.key],
    path: page.path,
    screen: SEO_TOOL_SCREENS[page.key],
  })),
  { key: 'home', label: 'All calculators', path: '/', screen: 'RootTabs' },
];

/** 判断某 key 是否为当前激活项。 */
export function isActiveCalculator(activeKey: string, itemKey: string): boolean {
  return activeKey === itemKey;
}
