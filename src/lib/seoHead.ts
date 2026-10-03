/**
 * Web 端 SEO <head> 多语言切换（运行时）。
 *
 * 静态 shell 只生成英语版本（Cloudflare Pages 对 `/offset/?lang=es` 仍返回
 * `/offset/index.html`，query 不参与文件选择），所以西班牙语的 title / description /
 * canonical / hreflang 必须在 SPA 启动后在运行时改写到 document.head。
 *
 * 纯计算部分（`buildSeoHeadForPath` / `buildAlternatesForPath`）可被 node --test
 * 直接断言；DOM 改写部分只在浏览器执行，带 `typeof document` 守卫。
 */

import type { Lang } from '../i18n/lang.ts';
import {
  buildCanonicalUrl,
  findSeoToolPageByPath,
  getSeoToolPageCopy,
  SEO_SITE_URL,
  type SeoToolPageMeta,
} from '../seo/toolPages.ts';

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

/** hreflang 互链：en / es / x-default。仅工具页产出。 */
export function buildAlternatesForPath(
  pathname: string,
  siteUrl: string = SEO_SITE_URL,
): AlternateLink[] {
  const page = findSeoToolPageByPath(pathname);
  if (!page) {
    return [];
  }
  return [
    { hreflang: 'en', href: buildCanonicalUrl(page, siteUrl, 'en') },
    { hreflang: 'es', href: buildCanonicalUrl(page, siteUrl, 'es') },
    { hreflang: 'x-default', href: buildCanonicalUrl(page, siteUrl, 'en') },
  ];
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
    .querySelectorAll(`link[${I18N_ATTR}]`)
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
 * 工具页返回 true；首页等非工具页只同步 `<html lang>` 并返回 false。
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
