/**
 * Pro 内购初始化的平台入口（native）：直接调用 proStore。
 * Web 端由 proInit.web.ts 顶替，使 react-native-iap 不进 web 首屏 chunk。
 */

import { initProIap } from './proStore';

export function initPro(): Promise<void> {
  return initProIap();
}
