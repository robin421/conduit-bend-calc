import { PRODUCT_NAME, WATTFLOW_NAME } from '../seo/brand.ts';

/** Feedback Hub 的仓库路由标识；不是 Android applicationId。 */
export const FEEDBACK_PRODUCT = 'conduit';
export const FEEDBACK_BASE_URL = 'https://feedback-hub.robin421.workers.dev/';

export function feedbackLanguage(locale: string): string {
  const language = locale.toLowerCase().replace(/_/g, '-');
  if (/^zh-(tw|hk|mo|hant)(-|$)/.test(language)) return 'zh-tw';
  if (/^zh(-|$)/.test(language)) return 'zh';
  const base = language.split('-')[0];
  return ['en', 'ja', 'ko', 'es', 'de', 'fr'].includes(base) ? base : 'en';
}

export interface FeedbackEnvironment {
  version: string;
  platform: string;
  osVersion?: string | number;
  language: string;
}

/** 显式白名单：不拼接计算输入、历史、收据、用户标识或日志。 */
export function buildFeedbackUrl(environment: FeedbackEnvironment): string {
  const version = /^[a-zA-Z0-9][a-zA-Z0-9.+_-]{0,63}$/.test(environment.version) ? environment.version : 'unknown';
  const osVersion = String(environment.osVersion ?? '');
  const safeOsVersion = /^\d+(\.\d+)*$/.test(osVersion) ? osVersion : 'unknown';
  const os = environment.platform === 'android' ? `Android API ${safeOsVersion}`
    : environment.platform === 'ios' ? `iOS ${safeOsVersion}` : 'Web';
  const params = {
    pkg: FEEDBACK_PRODUCT,
    ver: version,
    os,
    lang: feedbackLanguage(environment.language),
    title: `${WATTFLOW_NAME} · ${PRODUCT_NAME}`,
  };
  return FEEDBACK_BASE_URL + '?' + Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
}
