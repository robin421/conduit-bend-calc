import { brandPalette } from '../brandPalette.ts';

/**
 * 产品元数据与历史 SEO 品牌常量（纯数据模块，不依赖 react-native）。
 *
 * 屏幕、document title、静态 HTML shell（scripts/gen-seo-tool-shells.ts）
 * 与生成脚本共用同一份品牌文案，杜绝漂移。
 * 应用页头使用现有应用图标；历史 SEO 品牌常量保留兼容。
 */

/** 历史 SEO 公司名，不用于应用页头。 */
export const WATTFLOW_NAME = 'WattFlow';
/** 品牌图形：闪电字形（text glyph，零依赖）。 */
export const WATTFLOW_LOGO = '⚡';
/** 固定产品名。 */
export const PRODUCT_NAME = 'Conduit Bend Calc';
/** 页脚品牌句。 */
export const BRAND_FOOTER = 'Built for field crews.';
/** <title> 统一后缀（注意前导空格）。 */
export const TITLE_SUFFIX = ' | WattFlow';
/**
 * 图标黄色品牌色。与 `src/theme.ts` 的 `lightColors.accent` 同值；
 * 单独导出是因为静态 HTML 生成脚本读不到 theme（依赖 react-native）。
 */
export const BRAND_COLOR = brandPalette.yellow;

/**
 * 给任意标题追加统一品牌后缀；已带后缀时幂等（不会出现 `| WattFlow | WattFlow`）。
 */
export function withBrandTitle(base: string): string {
  const trimmed = base.trim();
  return trimmed.endsWith(TITLE_SUFFIX) ? trimmed : `${trimmed}${TITLE_SUFFIX}`;
}
