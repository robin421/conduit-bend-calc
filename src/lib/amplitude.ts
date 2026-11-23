import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import appConfig from '../../app.json';
import {
  AMPLITUDE_API_ENDPOINT,
  AMPLITUDE_UTM_STORAGE_KEY,
  buildAmplitudeHttpBody,
  createAmplitudeClient,
  DEFAULT_AMPLITUDE_API_KEY,
  isExcludedAnalyticsEnvironment,
  parseIncomingUtmParams,
  resolveAmplitudeApiKey,
  sanitizeEventProperties,
  sanitizeIncomingUtmParams,
  sanitizeUserProperties,
  WEB_AMPLITUDE_API_KEY,
  type AmplitudeEventProperties,
  type AmplitudeUserProperties,
  type AnalyticsExclusionOptions,
  type IncomingUtmParams,
} from './amplitudeCore';

export {
  AMPLITUDE_API_ENDPOINT,
  AMPLITUDE_UTM_STORAGE_KEY,
  buildAmplitudeHttpBody,
  createAmplitudeClient,
  DEFAULT_AMPLITUDE_API_KEY,
  isExcludedAnalyticsEnvironment,
  parseIncomingUtmParams,
  resolveAmplitudeApiKey,
  sanitizeEventProperties,
  sanitizeIncomingUtmParams,
  sanitizeUserProperties,
  WEB_AMPLITUDE_API_KEY,
  type AmplitudeEventProperties,
  type AmplitudeUserProperties,
  type AnalyticsExclusionOptions,
  type IncomingUtmParams,
};

function resolveLanguage(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    return 'en';
  }
}

function resolveApiKey(): string {
  const envKey =
    typeof process !== 'undefined' && process.env
      ? process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY
      : undefined;
  return resolveAmplitudeApiKey(Platform.OS, envKey);
}

function isCurrentEnvironmentExcluded(): boolean {
  const isDev = typeof __DEV__ !== 'undefined' && Boolean(__DEV__);
  const hostname =
    typeof window !== 'undefined' && window.location
      ? window.location.hostname
      : undefined;
  const webdriver =
    typeof navigator !== 'undefined' &&
    Boolean((navigator as { webdriver?: boolean }).webdriver);
  const userAgent =
    typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  const forceSend =
    typeof process !== 'undefined' &&
    process.env?.EXPO_PUBLIC_AMPLITUDE_FORCE_SEND === '1';
  return isExcludedAnalyticsEnvironment({
    isDev,
    hostname,
    webdriver,
    userAgent,
    forceSend,
  });
}

let cachedWebSessionUtm: IncomingUtmParams | undefined;

function resolveWebSessionUtm(): Record<string, unknown> | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }
  const search = window.location?.search ?? '';
  const fromUrl = parseIncomingUtmParams(search);
  if (Object.keys(fromUrl).length > 0) {
    cachedWebSessionUtm = fromUrl;
    try {
      window.sessionStorage?.setItem(AMPLITUDE_UTM_STORAGE_KEY, JSON.stringify(fromUrl));
    } catch {
      /* ignore privacy mode / storage write errors */
    }
    return fromUrl as Record<string, unknown>;
  }
  try {
    const raw = window.sessionStorage?.getItem(AMPLITUDE_UTM_STORAGE_KEY);
    if (raw) {
      const parsed = sanitizeIncomingUtmParams(JSON.parse(raw));
      if (Object.keys(parsed).length > 0) {
        cachedWebSessionUtm = parsed;
        return parsed as Record<string, unknown>;
      }
    }
  } catch {
    /* ignore privacy mode / corrupted JSON */
  }
  return cachedWebSessionUtm as Record<string, unknown> | undefined;
}

const client = createAmplitudeClient({
  storage: AsyncStorage,
  apiKey: resolveApiKey(),
  platform: Platform.OS,
  appVersion: appConfig.expo.version,
  language: resolveLanguage(),
  isExcluded: isCurrentEnvironmentExcluded,
  defaultEventProperties: resolveWebSessionUtm,
});

/** 初始化 Amplitude（读取/生成匿名 device_id 与 session_id）；静默容错。 */
export function initAmplitude(): Promise<void> {
  resolveWebSessionUtm();
  return client.init();
}

/** 更新内存态白名单 user_properties（仅允许 is_pro / unit_system / app_lang），后续事件自动携带。 */
export function setAmplitudeUserProperties(props: AmplitudeUserProperties): void {
  client.setUserProperties(props);
}

/** 上报事件到 Amplitude HTTP API v2；参数经过白名单清洗，静默容错。 */
export function logAmplitudeEvent(
  eventType: string,
  eventProperties?: Record<string, unknown>,
): void {
  void client.logEvent(eventType, eventProperties);
}

/** 上报页面浏览事件。 */
export function logAmplitudeScreenView(screenName: string): void {
  void client.logScreenView(screenName);
}

/** 首次成功计算时触发一次 activation_completed（本地持久化去重）。 */
export function trackAmplitudeActivationIfNeeded(
  eventProperties?: Record<string, unknown>,
): void {
  void client.markActivationIfNeeded(eventProperties);
}
