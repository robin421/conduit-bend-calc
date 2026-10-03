import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildCanonicalUrl,
  buildFaqPageJsonLd,
  buildWebApplicationJsonLd,
  getSeoToolPage,
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
