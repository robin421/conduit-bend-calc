import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildCanonicalUrl,
  buildFaqPageJsonLd,
  buildRelatedLinks,
  buildWebApplicationJsonLd,
  findSeoToolPageByPath,
  getRelatedCalculatorsTitle,
  getSeoToolPage,
  getSeoToolPageCopy,
  isSeoToolPath,
  SEO_SITE_URL,
  SEO_TOOL_PAGES,
  SEO_TOOL_PATHS,
  type SeoToolKey,
} from './toolPages.ts';

const EXPECTED_KEYS: SeoToolKey[] = ['offset', 'saddle4', 'shrink', 'stubUp'];

test('SEO_TOOL_PAGES：恰好 4 个 P0 页面且 key 覆盖', () => {
  assert.equal(SEO_TOOL_PAGES.length, 4);
  assert.deepEqual(
    SEO_TOOL_PAGES.map((page) => page.key).sort(),
    [...EXPECTED_KEYS].sort(),
  );
});

test('title ≤ 60 字符且包含目标关键词', () => {
  const keywords: Record<SeoToolKey, string> = {
    offset: 'offset',
    saddle4: '4 point saddle',
    shrink: 'shrink',
    stubUp: 'stub',
  };
  for (const page of SEO_TOOL_PAGES) {
    assert.ok(
      page.title.length <= 60,
      `${page.key} title ${page.title.length} > 60: ${page.title}`,
    );
    assert.ok(
      page.title.toLowerCase().includes(keywords[page.key]),
      `${page.key} title missing keyword: ${page.title}`,
    );
  }
});

test('description ≤ 160 字符且非空', () => {
  for (const page of SEO_TOOL_PAGES) {
    assert.ok(
      page.description.length > 0 && page.description.length <= 160,
      `${page.key} description ${page.description.length} invalid`,
    );
  }
});

test('每个页面 h1 含目标关键词、路由唯一且无尾斜杠', () => {
  const paths = new Set<string>();
  const slugs = new Set<string>();
  for (const page of SEO_TOOL_PAGES) {
    assert.ok(page.h1.length > 0);
    assert.ok(page.path.startsWith('/'));
    assert.ok(!page.path.endsWith('/'));
    assert.ok(!paths.has(page.path), `duplicate path ${page.path}`);
    assert.ok(!slugs.has(page.slug), `duplicate slug ${page.slug}`);
    paths.add(page.path);
    slugs.add(page.slug);
  }
});

test('每个页面 3–5 条 FAQ，问答均非空', () => {
  for (const page of SEO_TOOL_PAGES) {
    assert.ok(
      page.faqs.length >= 3 && page.faqs.length <= 5,
      `${page.key} has ${page.faqs.length} faqs`,
    );
    for (const faq of page.faqs) {
      assert.ok(faq.question.trim().length > 0);
      assert.ok(faq.answer.trim().length > 0);
    }
  }
});

test('SEO_TOOL_PATHS 与页面 path 一致', () => {
  assert.deepEqual(
    [...SEO_TOOL_PATHS],
    SEO_TOOL_PAGES.map((page) => page.path),
  );
});

test('isSeoToolPath：容忍尾斜杠与大小写，拒绝其它路径', () => {
  assert.equal(isSeoToolPath('/offset'), true);
  assert.equal(isSeoToolPath('/offset/'), true);
  assert.equal(isSeoToolPath('/Offset'), true);
  assert.equal(isSeoToolPath('/4-point-saddle'), true);
  assert.equal(isSeoToolPath('/shrink'), true);
  assert.equal(isSeoToolPath('/stub-up'), true);
  assert.equal(isSeoToolPath('/'), false);
  assert.equal(isSeoToolPath('/offset-calculator'), false);
  assert.equal(isSeoToolPath('/nope'), false);
});

test('canonical 指向自身（带尾斜杠的目录 URL）', () => {
  const page = getSeoToolPage('offset');
  assert.equal(buildCanonicalUrl(page), `${SEO_SITE_URL}/offset/`);
  assert.equal(
    buildCanonicalUrl(page, 'https://example.com/'),
    'https://example.com/offset/',
  );
});

test('WebApplication JSON-LD 字段齐全且指向本页', () => {
  const page = getSeoToolPage('stubUp');
  const jsonLd = buildWebApplicationJsonLd(page);
  assert.equal(jsonLd['@type'], 'WebApplication');
  assert.equal(jsonLd.name, page.h1);
  assert.equal(jsonLd.url, `${SEO_SITE_URL}/stub-up/`);
  assert.equal(jsonLd.applicationCategory, 'UtilitiesApplication');
  assert.equal(jsonLd.operatingSystem, 'Any');
  assert.deepEqual(jsonLd.offers, {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  });
});

test('FAQPage JSON-LD 每个 FAQ 一个问题节点', () => {
  const page = getSeoToolPage('saddle4');
  const jsonLd = buildFaqPageJsonLd(page);
  assert.equal(jsonLd['@type'], 'FAQPage');
  const mainEntity = jsonLd.mainEntity as unknown[];
  assert.equal(mainEntity.length, page.faqs.length);
  const first = mainEntity[0] as Record<string, unknown>;
  assert.equal(first['@type'], 'Question');
  assert.equal(first.name, page.faqs[0].question);
  assert.deepEqual(first.acceptedAnswer, {
    '@type': 'Answer',
    text: page.faqs[0].answer,
  });
});

/* ---------------- 相关计算器内链（单一口径） ---------------- */

test('buildRelatedLinks：恰好 4 条（其余 3 页 + 首页）且不自链', () => {
  for (const page of SEO_TOOL_PAGES) {
    const links = buildRelatedLinks(page);
    assert.equal(links.length, 4, `${page.key} link count`);
    const keys = links.map((link) => link.key);
    assert.ok(!keys.includes(page.key), `${page.key} links to itself`);
    assert.equal(keys[keys.length - 1], 'home');
    for (const link of links) {
      assert.ok(link.title.trim().length > 0, `${link.key} title empty`);
      assert.ok(link.path.startsWith('/'), `${link.key} path ${link.path}`);
      if (link.key === 'home') {
        assert.equal(link.path, '/');
        assert.equal(link.description, null);
      } else {
        assert.ok(
          (link.description ?? '').trim().length > 0,
          `${link.key} description empty`,
        );
      }
    }
  }
});

test('related links 覆盖另外 3 个 slug 且指向正确路径', () => {
  const page = getSeoToolPage('offset');
  const toolLinks = buildRelatedLinks(page).filter(
    (link) => link.key !== 'home',
  );
  assert.deepEqual(
    toolLinks.map((link) => link.path).sort(),
    ['/4-point-saddle', '/shrink', '/stub-up'].sort(),
  );
  const first = getSeoToolPage(toolLinks[0].key as SeoToolKey);
  assert.equal(toolLinks[0].title, first.h1);
  assert.equal(toolLinks[0].description, first.tagline);
});

test('es related links 用西语 h1 / tagline，标题随语言切换', () => {
  const page = getSeoToolPage('shrink');
  const offset = buildRelatedLinks(page, 'es').find(
    (link) => link.key === 'offset',
  );
  assert.equal(offset?.title, getSeoToolPage('offset').es.h1);
  assert.equal(offset?.description, getSeoToolPage('offset').es.tagline);
  assert.equal(getRelatedCalculatorsTitle(), 'Related calculators');
  assert.equal(getRelatedCalculatorsTitle('es'), 'Calculadoras relacionadas');
});

test('文案不含 emoji（title / tagline / FAQ / related）', () => {
  const emoji = /\p{Extended_Pictographic}/u;
  for (const page of SEO_TOOL_PAGES) {
    assert.ok(
      !emoji.test(JSON.stringify(page)),
      `${page.key} contains emoji`,
    );
  }
});

/* ---------------- 多语言（en 基准 + es） ---------------- */

const ES_KEYWORDS: Record<SeoToolKey, string> = {
  offset: 'desplazamiento',
  saddle4: 'silla',
  shrink: 'contracción',
  stubUp: 'subida',
};

test('es 文案字段齐全：title/description/h1/tagline/faqs', () => {
  for (const page of SEO_TOOL_PAGES) {
    const es = page.es;
    for (const field of ['title', 'description', 'h1', 'tagline'] as const) {
      assert.ok(
        typeof es[field] === 'string' && es[field].trim().length > 0,
        `${page.key}.es.${field} missing`,
      );
    }
    assert.ok(es.faqs.length >= 3 && es.faqs.length <= 5, `${page.key} es faqs`);
    for (const faq of es.faqs) {
      assert.ok(faq.question.trim().length > 0);
      assert.ok(faq.answer.trim().length > 0);
    }
  }
});

test('es title ≤ 60、description ≤ 160，且含西语关键词', () => {
  for (const page of SEO_TOOL_PAGES) {
    assert.ok(
      page.es.title.length <= 60,
      `${page.key} es title ${page.es.title.length} > 60`,
    );
    assert.ok(
      page.es.title.includes('| WattFlow'),
      `${page.key} es title missing brand suffix`,
    );
    assert.ok(
      page.es.description.length > 0 && page.es.description.length <= 160,
      `${page.key} es description ${page.es.description.length} invalid`,
    );
    assert.ok(
      page.es.title.toLowerCase().includes(ES_KEYWORDS[page.key]),
      `${page.key} es title missing keyword: ${page.es.title}`,
    );
  }
});

test('西语不使用 tubería（统一 conducto）', () => {
  for (const page of SEO_TOOL_PAGES) {
    const text = JSON.stringify(page.es).toLowerCase();
    assert.ok(!text.includes('tuber'), `${page.key} es copy uses tubería`);
    assert.match(text, /conducto/);
  }
});

test('getSeoToolPageCopy：en 平铺，es 取 page.es', () => {
  const page = getSeoToolPage('offset');
  assert.equal(getSeoToolPageCopy(page, 'en').h1, page.h1);
  assert.equal(getSeoToolPageCopy(page, 'es').h1, page.es.h1);
  assert.equal(getSeoToolPageCopy(page).h1, page.h1);
});

test('findSeoToolPageByPath：容忍尾斜杠 / 大小写，非工具页 null', () => {
  assert.equal(findSeoToolPageByPath('/offset')?.key, 'offset');
  assert.equal(findSeoToolPageByPath('/Offset/')?.key, 'offset');
  assert.equal(findSeoToolPageByPath('/4-point-saddle/')?.key, 'saddle4');
  assert.equal(findSeoToolPageByPath('/'), null);
  assert.equal(findSeoToolPageByPath('/nope'), null);
});

test('es canonical 带 ?lang=es，JSON-LD 用西语文案', () => {
  const page = getSeoToolPage('stubUp');
  assert.equal(
    buildCanonicalUrl(page, SEO_SITE_URL, 'es'),
    `${SEO_SITE_URL}/stub-up/?lang=es`,
  );
  const jsonLd = buildWebApplicationJsonLd(page, SEO_SITE_URL, 'es');
  assert.equal(jsonLd.name, page.es.h1);
  assert.equal(jsonLd.inLanguage, 'es');
  const faq = buildFaqPageJsonLd(page, 'es');
  const mainEntity = faq.mainEntity as unknown[];
  assert.equal(
    (mainEntity[0] as Record<string, unknown>).name,
    page.es.faqs[0].question,
  );
});
