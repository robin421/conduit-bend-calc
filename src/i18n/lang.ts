/**
 * 语言基础定义（纯数据模块，可被 node --test 直接 import）。
 *
 * 与 React / react-native 无关：语言规范化、`?lang=` 解析、优先顺序、
 * URL 参数改写、localStorage 读写都做成纯函数，方便单测。
 * 只有 `?lang=` 支持（`/es/` 前缀改造留待后续），符合 brief 要求。
 */

export type Lang = 'en' | 'es';

/** 受支持语言（顺序即切换器展示顺序）。 */
export const LANGS: readonly Lang[] = ['en', 'es'] as const;

/** 默认语言（英语）。 */
export const DEFAULT_LANG: Lang = 'en';

/** localStorage 键（brief 明确要求 localStorage 持久化）。 */
export const LANG_STORAGE_KEY = 'bendcalc:lang:v1';

/** URL 查询参数名。 */
export const LANG_QUERY_PARAM = 'lang';

/** 语言显示名（切换器无障碍标签用）。 */
export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  es: 'Español',
};

/** 窄化任意值为受支持语言。 */
export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'es';
}

/**
 * 规范化语言字符串：`es-MX` / `ES_mx` → `es`；未知值回退英语，不抛异常。
 */
export function normalizeLang(value: string | null | undefined): Lang {
  if (!value) {
    return DEFAULT_LANG;
  }
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLang(base) ? base : DEFAULT_LANG;
}

/**
 * 从 URL search（或完整 URL）解析 `?lang=`；不存在或非法返回 null。
 * 用正则而非 URLSearchParams，兼容 RN Hermes 与 Node。
 */
export function resolveLangFromSearch(
  search: string | null | undefined,
): Lang | null {
  if (!search) {
    return null;
  }
  const match = /[?&]lang=([a-zA-Z_-]+)/.exec(search);
  if (!match) {
    return null;
  }
  const base = match[1].trim().toLowerCase().split(/[-_]/)[0];
  return isLang(base) ? base : null;
}

/**
 * 初始语言优先级：URL `?lang=` > 已存 localStorage > 默认英语。
 * URL 显式指定时永远压过历史选择（分享链接能落到正确语言）。
 */
export function resolveInitialLang(
  search: string | null | undefined,
  stored: string | null | undefined,
): Lang {
  return resolveLangFromSearch(search) ?? normalizeLang(stored);
}

export interface LangStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 读取已存语言；storage 缺失或抛错一律回退默认语言。 */
export function readStoredLang(storage: LangStorage | null | undefined): Lang {
  if (!storage) {
    return DEFAULT_LANG;
  }
  try {
    return normalizeLang(storage.getItem(LANG_STORAGE_KEY));
  } catch {
    return DEFAULT_LANG;
  }
}

/** 持久化语言选择；storage 缺失或抛错静默忽略（隐私模式下不崩）。 */
export function persistLang(
  storage: LangStorage | null | undefined,
  lang: Lang,
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // localStorage 可能被禁用 / 配额满：语言仍在本进程内生效。
  }
}

/**
 * 在 URL 上设置 `lang` 参数（保留 path / 其它 query / hash）。
 * - `en` 时移除该参数（默认语言不写进 URL，保持 canonical 干净）；
 * - 浏览器地址栏更新由调用方用 history.replaceState 完成，本函数只算字符串。
 */
export function withLangQuery(url: string, lang: Lang): string {
  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const queryIndex = withoutHash.indexOf('?');
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';
  const params = query
    .split('&')
    .filter((pair) => pair.length > 0 && !/^lang=/i.test(pair));
  if (lang !== DEFAULT_LANG) {
    params.push(`${LANG_QUERY_PARAM}=${lang}`);
  }
  const nextQuery = params.join('&');
  return `${path}${nextQuery ? `?${nextQuery}` : ''}${hash}`;
}
