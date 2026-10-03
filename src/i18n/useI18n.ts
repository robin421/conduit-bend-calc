/**
 * React 语言 hook：`useI18n()` 返回当前语言、写死的 `t` 与切换函数。
 *
 * 用 `useSyncExternalStore` 订阅模块级仓库，语言切换时所有调用组件一起重渲染。
 */

import { useCallback, useSyncExternalStore } from 'react';

import {
  translate,
  type TranslationKey,
  type TranslationParams,
} from './dictionaries.ts';
import type { Lang } from './lang.ts';
import { getLang, setLang as setGlobalLang, subscribeLang } from './store.ts';

export interface I18n {
  /** 当前语言。 */
  lang: Lang;
  /** 取词（带 `{name}` 插值）。 */
  t: (key: TranslationKey, params?: TranslationParams) => string;
  /** 切换语言（会持久化 + 改 URL + 改 head）。 */
  setLang: (lang: Lang) => void;
}

export function useI18n(): I18n {
  const lang = useSyncExternalStore(subscribeLang, getLang, getLang);
  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) =>
      translate(lang, key, params),
    [lang],
  );
  return { lang, t, setLang: setGlobalLang };
}
