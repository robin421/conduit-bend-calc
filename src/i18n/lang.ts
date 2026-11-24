/**
 * 语言基础定义（纯数据模块，可被 node --test 直接 import）。
 *
 * 与 React / react-native 无关：语言规范化、`/es/` 路径前缀解析、`?lang=` 解析、
 * 优先顺序、URL 改写、localStorage 读写都做成纯函数，方便单测。
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
 * 从系统 locale 检测默认语言：`es` / `es-MX` / `es-US` / `es-419` 等西语系返回 `'es'`，其他返回 `'en'`。
 */
export function detectSystemLang(locale?: string | null): Lang {
  if (!locale) {
    return DEFAULT_LANG;
  }
  const base = locale.trim().toLowerCase().split(/[-_]/)[0];
  return base === 'es' ? 'es' : DEFAULT_LANG;
}

/**
 * 解析已保存语言字符串：仅当为受支持语言时返回 Lang，空值或未知值返回 null。
 * 用于区分「未保存 (null)」与「用户显式选择了 en」。
 */
export function parseStoredLang(value: string | null | undefined): Lang | null {
  if (!value) {
    return null;
  }
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLang(base) ? base : null;
}

/**
 * 规范化语言字符串：`es-MX` / `ES_mx` → `es`；未知值回退英语，不抛异常。
 */
export function normalizeLang(value: string | null | undefined): Lang {
  return parseStoredLang(value) ?? DEFAULT_LANG;
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
 * 从 URL pathname 解析 `/es` 或 `/es/...` 路径前缀；匹配返回 `'es'`，否则返回 null。
 * 拒绝 `/escalator` 或 `/es-guide` 等非语言段前缀。
 */
export function resolveLangFromPath(
  pathname: string | null | undefined,
): Lang | null {
  if (!pathname) {
    return null;
  }
  const clean = pathname.trim().split(/[?#]/)[0];
  return /^\/es(?:\/|$)/i.test(clean) ? 'es' : null;
}

/**
 * 剥离路径开头的 `/es` 语言前缀（保留其余路径与尾斜杠）：
 * `/es` / `/es/` → `/`，`/es/offset/` → `/offset/`，`/offset/` → `/offset/`。
 */
export function stripLangPrefix(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed) {
    return '/';
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (/^\/es\/?$/i.test(withLeadingSlash)) {
    return '/';
  }
  if (/^\/es\//i.test(withLeadingSlash)) {
    return withLeadingSlash.slice(3);
  }
  return withLeadingSlash;
}

/**
 * 为内部 Web 路由加上或移除 `/es` 语言前缀（幂等）：
 * - `en`：`/` → `/`，`/es/offset/` → `/offset/`，`/offset` → `/offset`
 * - `es`：`/` → `/es/`，`/offset` → `/es/offset`，`/offset/` → `/es/offset/`
 */
export function localizePath(pathname: string, lang: Lang): string {
  const base = stripLangPrefix(pathname);
  if (lang === DEFAULT_LANG) {
    return base;
  }
  return base === '/' ? '/es/' : `/es${base}`;
}

/**
 * 初始语言优先级：URL 路径 `/es/...` > URL `?lang=` > 用户已保存语言 > 系统 locale 检测 > 默认英语。
 * URL 显式指定时永远压过历史选择（分享链接与静态 `/es/` 页能落到正确语言）；
 * 仅当 `stored` 为有效语言值时才视为已保存（区分未保存 null 与显式选 en）。
 */
export function resolveInitialLang(
  search: string | null | undefined,
  stored: string | null | undefined,
  systemLocale?: string | null,
  pathname?: string | null,
): Lang {
  return (
    resolveLangFromPath(pathname) ??
    resolveLangFromSearch(search) ??
    parseStoredLang(stored) ??
    detectSystemLang(systemLocale)
  );
}

export interface LangStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 读取原始已存语言：未保存、非法或抛错时返回 null（不回退默认语言）。 */
export function readRawStoredLang(
  storage: LangStorage | null | undefined,
): Lang | null {
  if (!storage) {
    return null;
  }
  try {
    return parseStoredLang(storage.getItem(LANG_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** 读取已存语言；storage 缺失或抛错一律回退默认语言。 */
export function readStoredLang(storage: LangStorage | null | undefined): Lang {
  return readRawStoredLang(storage) ?? DEFAULT_LANG;
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

/**
 * 在 Web 端 EN ↔ ES 切换时构造规范的静态路径 URL：
 * - `/` ↔ `/es/`，`/<slug>/` ↔ `/es/<slug>/`（无扩展名目录补尾斜杠与静态 canonical 一致）；
 * - 剥离冗余的 `?lang=...` 参数，保留其它 query 参数与 `#hash`。
 */
export function withLangPath(
  pathname: string,
  search: string,
  hash: string,
  lang: Lang,
): string {
  const basePath = stripLangPrefix(pathname || '/');
  const hasFileExt = /\/[^/]+\.[a-z0-9]+$/i.test(basePath);
  const normalizedBase =
    basePath === '/' || hasFileExt || basePath.endsWith('/')
      ? basePath
      : `${basePath}/`;
  const nextPath =
    lang === DEFAULT_LANG
      ? normalizedBase
      : normalizedBase === '/'
        ? '/es/'
        : `/es${normalizedBase}`;

  const rawQuery = search ? search.replace(/^\?/, '') : '';
  const params = rawQuery
    .split('&')
    .filter((pair) => pair.length > 0 && !/^lang=/i.test(pair));
  const nextQuery = params.length > 0 ? `?${params.join('&')}` : '';
  const nextHash = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : '';

  return `${nextPath}${nextQuery}${nextHash}`;
}
