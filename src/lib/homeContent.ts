/**
 * 计算首页的纯常量（不依赖 react-native，便于单测）。
 */
import type { HistoryKind } from './historyStore.ts';

/** 首页继续计算与历史回填共用的真实导航目标。 */
export const HISTORY_CALCULATOR_SCREENS = {
  offset: 'Offset',
  stub: 'Stub',
  threePointSaddle: 'ThreePointSaddle',
  fourPointSaddle: 'FourPointSaddle',
  rollingOffset: 'RollingOffset',
  kicked90: 'Kicked90',
} as const satisfies Record<HistoryKind, string>;

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

export interface GooglePlayUtmParams {
  source: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

function sanitizeUtmValue(value: string | undefined): string {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

/**
 * 构造带 Google Play Install Referrer UTM 参数的商店链接。
 * 仅保留非空字段，并将值严格清洗为 `[a-z0-9_-]`，避免注入与 PII。
 */
export function buildGooglePlayUrl(params: GooglePlayUtmParams): string {
  const entries: Array<[string, string]> = [
    ['utm_source', sanitizeUtmValue(params.source)],
    ['utm_medium', sanitizeUtmValue(params.medium)],
    ['utm_campaign', sanitizeUtmValue(params.campaign)],
    ['utm_content', sanitizeUtmValue(params.content)],
  ];
  const referrer = entries
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  if (!referrer) {
    return GOOGLE_PLAY_URL;
  }
  return `${GOOGLE_PLAY_URL}&referrer=${encodeURIComponent(referrer)}`;
}

/** 646x250 徽章图的宽高比。 */
export const GOOGLE_PLAY_BADGE_ASPECT_RATIO = 646 / 250;
