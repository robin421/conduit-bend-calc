import { Linking, Platform } from 'react-native';
import appConfig from '../../app.json';
import { buildFeedbackUrl } from './feedbackLink';

/** 生成当前运行环境的共享反馈表单 URL（仅包含版本、系统与语言白名单）。 */
export function getFeedbackUrl(): string {
  let language = 'en';
  try {
    language = Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    /* use English */
  }
  return buildFeedbackUrl({
    version: appConfig.expo.version,
    platform: Platform.OS,
    osVersion: Platform.OS === 'web' ? undefined : Platform.Version,
    language,
  });
}

/** 外部浏览器打开共享表单（作为内置页异常或非导航上下文的兜底）。 */
export async function openFeedback(): Promise<void> {
  await Linking.openURL(getFeedbackUrl());
}
