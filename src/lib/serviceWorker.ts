/**
 * Service worker 注册（Web 端离线可用，工地没信号也能打开算）。
 *
 * 缓存策略见构建期生成的 `/sw.js`：只预缓存首屏关键资源
 * （HTML shell + 当前 JS bundle），导航请求 network-first、离线回退 shell。
 * 这里只负责注册与前置条件判断，核心判断抽成纯函数便于单测。
 */

export interface ServiceWorkerEnv {
  isWeb: boolean;
  /** location.protocol，如 'https:' / 'http:'。 */
  protocol: string;
  /** location.hostname。 */
  hostname: string;
  /** navigator 上是否存在 serviceWorker。 */
  hasServiceWorker: boolean;
}

/** 仅在 Web + HTTPS（或 localhost 调试）且浏览器支持 SW 时注册。 */
export function shouldRegisterServiceWorker(env: ServiceWorkerEnv): boolean {
  if (!env.isWeb || !env.hasServiceWorker) {
    return false;
  }
  const isLocalhost =
    env.hostname === 'localhost' ||
    env.hostname === '127.0.0.1' ||
    env.hostname === '[::1]';
  return env.protocol === 'https:' || isLocalhost;
}

/** 生产入口：注册 /sw.js。任何异常吞掉，绝不影响页面功能。 */
export function registerServiceWorker(isWeb: boolean): void {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }
    const env: ServiceWorkerEnv = {
      isWeb,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      hasServiceWorker: 'serviceWorker' in navigator,
    };
    if (!shouldRegisterServiceWorker(env)) {
      return;
    }
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  } catch {
    // 静默：注册失败不影响任何业务逻辑。
  }
}
