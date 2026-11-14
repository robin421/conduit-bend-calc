import { Linking, Platform } from 'react-native';
import appConfig from '../../app.json';
import { buildFeedbackUrl } from './feedbackLink';

/** 只打开共享表单；工单由用户确认后提交，应用不代发反馈。 */
export async function openFeedback(): Promise<void> {
  let language = 'en';
  try { language = Intl.DateTimeFormat().resolvedOptions().locale; } catch { /* use English */ }
  await Linking.openURL(buildFeedbackUrl({
    version: appConfig.expo.version,
    platform: Platform.OS,
    osVersion: Platform.OS === 'web' ? undefined : Platform.Version,
    language,
  }));
}
