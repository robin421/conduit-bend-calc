/**
 * SEO 工具页路由映射：key → React Navigation screen 名 / Web path。
 * 静态 shell 生成脚本与根导航共用 src/seo/toolPages.ts 的 path，
 * 避免出现「屏幕注册名与 URL 不一致」的隐性 404。
 */

import type { SeoToolKey } from '../seo/toolPages.ts';

export type SeoScreenName =
  | 'SeoOffset'
  | 'SeoSaddle4'
  | 'SeoShrink'
  | 'SeoStubUp';

export const SEO_TOOL_SCREENS: Record<SeoToolKey, SeoScreenName> = {
  offset: 'SeoOffset',
  saddle4: 'SeoSaddle4',
  shrink: 'SeoShrink',
  stubUp: 'SeoStubUp',
};
