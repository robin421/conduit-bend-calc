import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import appConfig from '../../app.json';
import {
  AMPLITUDE_API_ENDPOINT,
  buildAmplitudeHttpBody,
  createAmplitudeClient,
  DEFAULT_AMPLITUDE_API_KEY,
  sanitizeEventProperties,
  type AmplitudeEventProperties,
} from './amplitudeCore';

export {
  AMPLITUDE_API_ENDPOINT,
  buildAmplitudeHttpBody,
  createAmplitudeClient,
  DEFAULT_AMPLITUDE_API_KEY,
  sanitizeEventProperties,
  type AmplitudeEventProperties,
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
  return envKey?.trim() || DEFAULT_AMPLITUDE_API_KEY;
}

const client = createAmplitudeClient({
  storage: AsyncStorage,
  apiKey: resolveApiKey(),
  platform: Platform.OS,
  appVersion: appConfig.expo.version,
  language: resolveLanguage(),
});

/** 初始化 Amplitude（读取/生成匿名 device_id 与 session_id）；静默容错。 */
export function initAmplitude(): Promise<void> {
  return client.init();
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
