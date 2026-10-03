/**
 * 语言全局仓库（进程内单例 + localStorage 持久化 + URL/head 副作用）。
 *
 * 刻意不依赖 React：`useI18n` 通过 `useSyncExternalStore` 订阅这里，
 * 这样纯逻辑可以脱离 React 在 node --test 里断言。
 *
 * 副作用只在浏览器执行（`typeof window` 守卫），Native 端语言逻辑无副作用。
 */

import { applySeoHead } from '../lib/seoHead.ts';
import {
  DEFAULT_LANG,
  persistLang,
  readStoredLang,
  resolveInitialLang,
  withLangQuery,
  type Lang,
  type LangStorage,
} from './lang.ts';

let currentLang: Lang = DEFAULT_LANG;
let initialized = false;
const listeners = new Set<() => void>();

/** 当前语言（快照，供 useSyncExternalStore 使用）。 */
export function getLang(): Lang {
  return currentLang;
}

/** 订阅语言变化；返回取消订阅函数。 */
export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getBrowserStorage(): LangStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  } catch {
    // 隐私模式 / 禁用 storage：语言仍在本进程内可用。
    return null;
  }
}

/** 用户显式切换时把 `?lang=` 写回地址栏（replaceState，不新增历史记录）。 */
function replaceUrlLang(lang: Lang): void {
  if (typeof window === 'undefined' || !window.history?.replaceState || !window.location) {
    return;
  }
  const { pathname, search, hash } = window.location;
  const next = withLangQuery(`${pathname}${search}${hash}`, lang);
  window.history.replaceState(window.history.state, '', next);
}

function applyBrowserHead(lang: Lang): void {
  // React Native 定义了全局 window 但没有 window.location，只检查
  // `typeof window` 会在 Native 启动时由 initI18n() 触发崩溃。
  if (typeof window === 'undefined' || !window.location) {
    return;
  }
  applySeoHead(lang, window.location.pathname);
}

/** 显式切换语言：持久化 → 改 URL → 改 head → 通知订阅者。 */
export function setLang(next: Lang): void {
  if (next === currentLang) {
    return;
  }
  currentLang = next;
  persistLang(getBrowserStorage(), next);
  replaceUrlLang(next);
  applyBrowserHead(next);
  emit();
}

/**
 * 首屏初始化：URL `?lang=` > localStorage > 默认英语。
 * 幂等，多次调用只生效一次；不在初始化时改写 URL（避免给 canonical URL 添参数）。
 */
export function initI18n(): Lang {
  if (initialized) {
    return currentLang;
  }
  initialized = true;
  const search =
    typeof window !== 'undefined' && window.location
      ? window.location.search
      : '';
  currentLang = resolveInitialLang(search, readStoredLang(getBrowserStorage()));
  persistLang(getBrowserStorage(), currentLang);
  applyBrowserHead(currentLang);
  return currentLang;
}

/** 仅供测试：重置进程内状态（不触碰真实 storage）。 */
export function __resetI18nForTests(lang: Lang = DEFAULT_LANG): void {
  currentLang = lang;
  initialized = false;
  listeners.clear();
}
