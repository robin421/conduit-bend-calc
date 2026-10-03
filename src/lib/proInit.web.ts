/**
 * Pro 内购初始化的平台入口（web）：no-op。
 *
 * 内购只在原生商店存在；Web 端返回 resolved Promise，
 * 从而把 proStore / rnIapGateway / react-native-iap 全部挡在 web 首屏之外。
 * 付费页在 Web 上仍可加载（其自身 lazy chunk 会引入 proStore），只是不初始化购买监听。
 */

export function initPro(): Promise<void> {
  return Promise.resolve();
}
