/**
 * Web 端 SEO <head> 多语言同步（运行时）。
 *
 * 静态 shell 同时生成英语（`/<slug>/`、`/`）与西班牙语（`/es/<slug>/`、`/es/`）版本；
 * 用户在 SPA 内切换语言或前端导航时，由本模块实时同步 `<html lang>`、title、
 * description、canonical、OG/Twitter 与双向 hreflang（en / es / x-default）。
 *
 * 纯计算部分（`buildSeoHeadForPath` / `buildAlternatesForPath`）可被 node --test
 * 直接断言；DOM 改写部分只在浏览器执行，带 `typeof document` 守卫。
 */

import { stripLangPrefix, type Lang } from '../i18n/lang.ts';
import {
  buildCanonicalUrl,
  buildHomeCanonicalUrl,
  findSeoToolPageByPath,
  getSeoToolPageCopy,
  SEO_SITE_URL,
  type SeoToolPageMeta,
} from '../seo/toolPages.ts';
import { getWebDocumentTitle } from './documentTitle.ts';

export interface SeoHeadContent {
  title: string;
  description: string;
  canonical: string;
}

export interface AlternateLink {
  hreflang: string;
  href: string;
}

/** 根据 pathname + 语言计算该工具页的 title/description/canonical；非工具页返回 null。 */
export function buildSeoHeadForPath(
  pathname: string,
  lang: Lang,
  siteUrl: string = SEO_SITE_URL,
): SeoHeadContent | null {
  const page = findSeoToolPageByPath(pathname);
  if (!page) {
    return null;
  }
  const copy = getSeoToolPageCopy(page, lang);
  return {
    title: copy.title,
    description: copy.description,
    canonical: buildCanonicalUrl(page, siteUrl, lang),
  };
}

/** hreflang 互链：en / es / x-default。支持工具页（`/<slug>/` 与 `/es/<slug>/`）和首页（`/` 与 `/es/`）。 */
export function buildAlternatesForPath(
  pathname: string,
  siteUrl: string = SEO_SITE_URL,
): AlternateLink[] {
  const page = findSeoToolPageByPath(pathname);
  if (page) {
    return [
      { hreflang: 'en', href: buildCanonicalUrl(page, siteUrl, 'en') },
      { hreflang: 'es', href: buildCanonicalUrl(page, siteUrl, 'es') },
      { hreflang: 'x-default', href: buildCanonicalUrl(page, siteUrl, 'en') },
    ];
  }
  if (stripLangPrefix(pathname) === '/') {
    return [
      { hreflang: 'en', href: buildHomeCanonicalUrl(siteUrl, 'en') },
      { hreflang: 'es', href: buildHomeCanonicalUrl(siteUrl, 'es') },
      { hreflang: 'x-default', href: buildHomeCanonicalUrl(siteUrl, 'en') },
    ];
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* DOM 改写（仅浏览器）                                                */
/* ------------------------------------------------------------------ */

const I18N_ATTR = 'data-wattflow-i18n';

function upsertMeta(
  doc: Document,
  attribute: 'name' | 'property',
  value: string,
  content: string,
): void {
  let el = doc.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${value}"]`,
  );
  if (!el) {
    el = doc.createElement('meta');
    el.setAttribute(attribute, value);
    doc.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(doc: Document, rel: string, href: string): void {
  let el = doc.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = doc.createElement('link');
    el.setAttribute('rel', rel);
    doc.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function refreshAlternates(
  doc: Document,
  alternates: readonly AlternateLink[],
): void {
  doc.head
    .querySelectorAll(`link[${I18N_ATTR}], link[rel="alternate"][hreflang]`)
    .forEach((node) => node.remove());
  for (const alternate of alternates) {
    const el = doc.createElement('link');
    el.setAttribute('rel', 'alternate');
    el.setAttribute('hreflang', alternate.hreflang);
    el.setAttribute('href', alternate.href);
    el.setAttribute(I18N_ATTR, '1');
    doc.head.appendChild(el);
  }
}

/**
 * 把当前语言的 title/description/canonical/og/twitter/hreflang 写入 document。
 * 工具页返回 true；首页同步 `<html lang>` / title / canonical / hreflang 并返回 false；
 * 其它非工具页只同步 `<html lang>` 并返回 false。
 */
export function applySeoHead(
  lang: Lang,
  pathname: string,
  doc: Document | undefined = typeof document === 'undefined'
    ? undefined
    : document,
): boolean {
  if (!doc) {
    return false;
  }
  doc.documentElement?.setAttribute('lang', lang);
  const head = buildSeoHeadForPath(pathname, lang);
  if (!head) {
    if (stripLangPrefix(pathname) === '/') {
      const homeTitle = getWebDocumentTitle(lang);
      const homeCanonical = buildHomeCanonicalUrl(SEO_SITE_URL, lang);
      doc.title = homeTitle;
      upsertMeta(doc, 'property', 'og:title', homeTitle);
      upsertMeta(doc, 'property', 'og:url', homeCanonical);
      upsertMeta(doc, 'name', 'twitter:title', homeTitle);
      upsertLink(doc, 'canonical', homeCanonical);
      refreshAlternates(doc, buildAlternatesForPath(pathname));
    }
    return false;
  }
  doc.title = head.title;
  upsertMeta(doc, 'name', 'description', head.description);
  upsertMeta(doc, 'property', 'og:title', head.title);
  upsertMeta(doc, 'property', 'og:description', head.description);
  upsertMeta(doc, 'property', 'og:url', head.canonical);
  upsertMeta(doc, 'name', 'twitter:title', head.title);
  upsertMeta(doc, 'name', 'twitter:description', head.description);
  upsertLink(doc, 'canonical', head.canonical);
  refreshAlternates(doc, buildAlternatesForPath(pathname));
  return true;
}

export type { SeoToolPageMeta };
