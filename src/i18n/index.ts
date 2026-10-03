/**
 * i18n 公共入口：语言常量 / 字典 / 仓库 / React hook。
 *
 * 需要纯逻辑（node --test）时优先从 `./lang.ts` / `./dictionaries.ts` 直接 import，
 * 避免把 React 拉进测试。
 */

export * from './lang.ts';
export * from './dictionaries.ts';
export {
  getLang,
  setLang,
  subscribeLang,
  initI18n,
} from './store.ts';
export { useI18n, type I18n } from './useI18n.ts';
