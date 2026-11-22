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
  LANG_STORAGE_KEY,
  parseStoredLang,
  persistLang,
  readRawStoredLang,
  resolveInitialLang,
  resolveLangFromSearch,
  withLangQuery,
  type Lang,
  type LangStorage,
} from './lang.ts';

export interface AsyncLangStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

let currentLang: Lang = DEFAULT_LANG;
let initialized = false;
let hasExplicitUserSelection = false;
let asyncStorage: AsyncLangStorage | null = null;
const listeners = new Set<() => void>();

/** 读取当前运行环境的系统 locale（Web / RN / Node 通用，失败回退 null）。 */
export function resolveRuntimeLocale(): string | null {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return typeof locale === 'string' && locale.trim().length > 0 ? locale : null;
  } catch {
    return null;
  }
}

/** 注入异步持久化适配器（如 Native 启动时注入 AsyncStorage），保持本模块不顶层 import RN。 */
export function configureAsyncLangStorage(adapter: AsyncLangStorage | null): void {
  asyncStorage = adapter;
}

function persistAsyncLang(lang: Lang): void {
  if (!asyncStorage) {
    return;
  }
  try {
    void asyncStorage.setItem(LANG_STORAGE_KEY, lang).catch(() => undefined);
  } catch {
    // 忽略异步存储写入异常，语言仍在本进程内生效。
  }
}

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

function syncAmplitudeAppLang(lang: Lang): void {
  try {
    const mod = require('../lib/amplitude') as {
      setAmplitudeUserProperties?: (props: { app_lang: Lang }) => void;
    };
    mod.setAmplitudeUserProperties?.({ app_lang: lang });
  } catch {
    /* best-effort in non-RN / test environments */
  }
}

/** 显式切换语言：持久化（Web + Native）→ 改 URL → 改 head → 同步 Amplitude → 通知订阅者。 */
export function setLang(next: Lang): void {
  hasExplicitUserSelection = true;
  persistLang(getBrowserStorage(), next);
  persistAsyncLang(next);
  if (next === currentLang) {
    return;
  }
  currentLang = next;
  replaceUrlLang(next);
  applyBrowserHead(next);
  syncAmplitudeAppLang(next);
  emit();
}

/**
 * 首屏初始化：URL `?lang=` > localStorage > 系统 locale > 默认英语。
 * 幂等，多次调用只生效一次；不在初始化时改写 URL（避免给 canonical URL 添参数）。
 */
export function initI18n(systemLocale?: string | null): Lang {
  if (initialized) {
    return currentLang;
  }
  initialized = true;
  const search =
    typeof window !== 'undefined' && window.location
      ? window.location.search
      : '';
  const urlLang = resolveLangFromSearch(search);
  const rawStored = readRawStoredLang(getBrowserStorage());
  const locale = systemLocale !== undefined ? systemLocale : resolveRuntimeLocale();
  currentLang = resolveInitialLang(search, rawStored, locale);
  if (urlLang !== null) {
    persistLang(getBrowserStorage(), urlLang);
  }
  applyBrowserHead(currentLang);
  syncAmplitudeAppLang(currentLang);
  return currentLang;
}

/**
 * 异步水合已保存语言（供 Native 启动时在注入 AsyncStorage 后调用）。
 * 仅在用户尚未手动切换且无 URL `?lang=` 覆盖时，使用已保存的有效语言覆盖首屏自动检测结果。
 */
export async function hydrateStoredLang(): Promise<Lang> {
  if (!asyncStorage || hasExplicitUserSelection) {
    return currentLang;
  }
  const search =
    typeof window !== 'undefined' && window.location
      ? window.location.search
      : '';
  if (resolveLangFromSearch(search) !== null) {
    return currentLang;
  }
  try {
    const raw = await asyncStorage.getItem(LANG_STORAGE_KEY);
    const stored = parseStoredLang(raw);
    if (stored !== null && !hasExplicitUserSelection) {
      if (stored !== currentLang) {
        currentLang = stored;
        applyBrowserHead(currentLang);
        syncAmplitudeAppLang(currentLang);
        emit();
      }
    }
  } catch {
    // 异步存储读取失败时保持当前语言，不抛异常。
  }
  return currentLang;
}

/** 仅供测试：重置进程内状态（不触碰真实 storage）。 */
export function __resetI18nForTests(lang: Lang = DEFAULT_LANG): void {
  currentLang = lang;
  initialized = false;
  hasExplicitUserSelection = false;
  asyncStorage = null;
  listeners.clear();
}
