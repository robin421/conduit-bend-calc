/**
 * Native 端占位：Metro 的 `import()` 动态分包只在 web 使用（native 的
 * `rootStack.tsx` 走静态 import），因此这里不需要加载任何 runtime。
 */
export {};
