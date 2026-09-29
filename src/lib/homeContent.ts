/**
 * 计算首页的纯常量（不依赖 react-native，便于单测）。
 */

/**
 * Home 卡片图标槽固定 48pt / 28pt 字号。
 *
 * Saddle 图标使用 LOGICAL AND（U+2227 "∧"）：字形窄，两个并排能放进图标槽。
 * 之前的 N-ARY LOGICAL AND（U+22C0 "⋀"）是大号运算符，字形宽，两个并排会
 * 超出槽宽，被 numberOfLines={1} 截断成省略号（视觉上像 "⋀ 后跟杂点"）。
 */
export const THREE_POINT_SADDLE_ICON = '∧';
export const FOUR_POINT_SADDLE_ICON = '∧∧';

/** Google Play 应用页链接：Web 下载引导浮层的 CTA 目标。 */
export const GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=com.robin421.conduitbendcalc';

/** 646x250 徽章图的宽高比。 */
export const GOOGLE_PLAY_BADGE_ASPECT_RATIO = 646 / 250;
