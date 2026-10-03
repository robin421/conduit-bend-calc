/**
 * Web 端入口：为 Metro 安装 `global.__loadBundleAsync`。
 *
 * Web 的 `rootStack.web.tsx` 用 `React.lazy(() => import(...))` 做按路由代码分割。
 * Metro 把 `import()` 编译成「读取 global.__loadBundleAsync → fetch+eval 对应 chunk」；
 * 该全局由 `@expo/metro-runtime` 注入（其 README 要求 import 到初始 bundle）。
 *
 * 缺少它时的故障链（2026-10-04 全站空白事故）：`__loadBundleAsync` 为 undefined
 * → Metro 退化成同步 `require(chunkModuleId)`，而该 module id 只注册在 async chunk
 * 里（主 bundle 没有）→ 抛 "Requiring unknown module" → `React.lazy` 的 promise
 * reject 且无 ErrorBoundary → React 卸载整棵 React 树 → `#root` 空白。
 *
 * 只放在 `.web.ts` 里，避免把 native 端的 fetch/location polyfill 打进 Android 包。
 */
import '@expo/metro-runtime';
