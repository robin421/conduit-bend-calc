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
import { en, type TranslationKey } from '../i18n/dictionaries.ts';
import { SEO_TOOL_PAGES, type SeoToolKey } from './toolPages.ts';

export interface CalculatorNavItem {
  /** 稳定 key（工具页用 SeoToolKey，首页用 'home'）。 */
  key: string;
  /** 英语短标签（静态回退 / 测试用）。 */
  label: string;
  /** 字典 key，UI 用 `t(labelKey)` 取当前语言文案。 */
  labelKey: TranslationKey;
  /** SPA 内路由（首页为 `/`）。 */
  path: string;
  /** React Navigation screen 名。 */
  screen: SeoScreenName | 'RootTabs';
}

/** 工具页在切换条上的短标签 key（页面 h1 太长，不适合芯片）。 */
const SHORT_LABEL_KEYS: Record<SeoToolKey, TranslationKey> = {
  offset: 'nav.offset',
  saddle4: 'nav.saddle4',
  shrink: 'nav.shrink',
  stubUp: 'nav.stubUp',
};

/** 4 个交互式工具页 + 回首页入口。顺序即切换条展示顺序。 */
export const CALCULATOR_NAV: readonly CalculatorNavItem[] = [
  ...SEO_TOOL_PAGES.map((page) => ({
    key: page.key as string,
    label: en[SHORT_LABEL_KEYS[page.key]],
    labelKey: SHORT_LABEL_KEYS[page.key],
    path: page.path,
    screen: SEO_TOOL_SCREENS[page.key],
  })),
  {
    key: 'home',
    label: en['nav.home'],
    labelKey: 'nav.home',
    path: '/',
    screen: 'RootTabs',
  },
];

/** 判断某 key 是否为当前激活项。 */
export function isActiveCalculator(activeKey: string, itemKey: string): boolean {
  return activeKey === itemKey;
}

/* ------------------------------------------------------------------ */
/* 响应式导航布局（纯函数，可被 node --test 直接断言）                */
/* ------------------------------------------------------------------ */

/**
 * 移动 / 桌面导航断点：宽 < 600pt 用汉堡 + 左侧抽屉，
 * 宽 >= 600pt 用横向切换条。与 `SeoCalcLayout` 的 600 断点保持一致。
 */
export const MOBILE_NAV_BREAKPOINT = 600;

/** 抽屉最大宽度（pt）。 */
export const DRAWER_MAX_WIDTH = 280;
/** 抽屉相对屏幕宽度的上限比例（更窄的手机上不超过屏幕 85%）。 */
export const DRAWER_WIDTH_RATIO = 0.85;
/** 抽屉滑入 / 滑出动画时长（ms），ease-out。 */
export const DRAWER_ANIMATION_MS = 300;

/** 是否使用移动端汉堡 + 抽屉导航。 */
export function isMobileNavViewport(width: number): boolean {
  return width < MOBILE_NAV_BREAKPOINT;
}

/** 导航呈现模式：`drawer` = 汉堡 + 左侧抽屉，`switcher` = 横向切换条。 */
export type CalculatorNavMode = 'drawer' | 'switcher';

/** 根据视口宽度决定导航呈现模式（SeoPage 与测试共用的唯一断点逻辑）。 */
export function calculatorNavMode(width: number): CalculatorNavMode {
  return isMobileNavViewport(width) ? 'drawer' : 'switcher';
}

/**
 * 计算抽屉宽度：280pt，且不超过屏幕宽度的 85%。
 * 传入的是 viewport 宽度（useWindowDimensions().width）。
 */
export function drawerWidthForViewport(width: number): number {
  if (!Number.isFinite(width) || width <= 0) {
    return DRAWER_MAX_WIDTH;
  }
  return Math.min(DRAWER_MAX_WIDTH, Math.floor(width * DRAWER_WIDTH_RATIO));
}
