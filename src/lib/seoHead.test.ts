import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildAlternatesForPath,
  buildSeoHeadForPath,
} from './seoHead.ts';
import { SEO_SITE_URL } from '../seo/toolPages.ts';

test('buildSeoHeadForPath：en / es 返回各自 title/description/canonical（静态 /es/<slug>/）', () => {
  const en = buildSeoHeadForPath('/offset', 'en');
  const es = buildSeoHeadForPath('/offset', 'es');
  const esFromPrefix = buildSeoHeadForPath('/es/offset/', 'es');
  assert.ok(en && es && esFromPrefix);
  assert.notEqual(en.title, es.title);
  assert.equal(en.canonical, `${SEO_SITE_URL}/offset/`);
  assert.equal(es.canonical, `${SEO_SITE_URL}/es/offset/`);
  assert.deepEqual(esFromPrefix, es);
  assert.match(es.title, /desplazamiento/i);
});

test('buildSeoHeadForPath：容忍尾斜杠、大小写与 /es/ 前缀，非工具页 null', () => {
  assert.equal(buildSeoHeadForPath('/Offset/', 'es')?.canonical, `${SEO_SITE_URL}/es/offset/`);
  assert.equal(buildSeoHeadForPath('/es/Offset', 'en')?.canonical, `${SEO_SITE_URL}/offset/`);
  assert.equal(buildSeoHeadForPath('/', 'es'), null);
  assert.equal(buildSeoHeadForPath('/es/', 'es'), null);
  assert.equal(buildSeoHeadForPath('/nope', 'en'), null);
});

test('buildAlternatesForPath：工具页与首页双向 en / es / x-default 三条互链', () => {
  const alternates = buildAlternatesForPath('/stub-up');
  assert.deepEqual(
    alternates.map((a) => a.hreflang),
    ['en', 'es', 'x-default'],
  );
  assert.equal(alternates[0].href, `${SEO_SITE_URL}/stub-up/`);
  assert.equal(alternates[1].href, `${SEO_SITE_URL}/es/stub-up/`);
  assert.equal(alternates[2].href, alternates[0].href);

  // /es/<slug>/ 产出完全一致的双向 hreflang
  assert.deepEqual(buildAlternatesForPath('/es/stub-up/'), alternates);

  // 首页 / 与 /es/ 产出首页双向 hreflang
  const homeAlternates = buildAlternatesForPath('/');
  assert.deepEqual(homeAlternates, [
    { hreflang: 'en', href: `${SEO_SITE_URL}/` },
    { hreflang: 'es', href: `${SEO_SITE_URL}/es/` },
    { hreflang: 'x-default', href: `${SEO_SITE_URL}/` },
  ]);
  assert.deepEqual(buildAlternatesForPath('/es/'), homeAlternates);
  assert.deepEqual(buildAlternatesForPath('/es'), homeAlternates);

  assert.deepEqual(buildAlternatesForPath('/nope'), []);
});
