import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildAlternatesForPath,
  buildSeoHeadForPath,
} from './seoHead.ts';
import { SEO_SITE_URL } from '../seo/toolPages.ts';

test('buildSeoHeadForPath：en / es 返回各自 title/description/canonical', () => {
  const en = buildSeoHeadForPath('/offset', 'en');
  const es = buildSeoHeadForPath('/offset', 'es');
  assert.ok(en && es);
  assert.notEqual(en.title, es.title);
  assert.equal(en.canonical, `${SEO_SITE_URL}/offset/`);
  assert.equal(es.canonical, `${SEO_SITE_URL}/offset/?lang=es`);
  assert.match(es.title, /desplazamiento/i);
});

test('buildSeoHeadForPath：容忍尾斜杠与大小写，非工具页 null', () => {
  assert.equal(buildSeoHeadForPath('/Offset/', 'es')?.canonical, `${SEO_SITE_URL}/offset/?lang=es`);
  assert.equal(buildSeoHeadForPath('/', 'es'), null);
  assert.equal(buildSeoHeadForPath('/nope', 'en'), null);
});

test('buildAlternatesForPath：en / es / x-default 三条互链', () => {
  const alternates = buildAlternatesForPath('/stub-up');
  assert.deepEqual(
    alternates.map((a) => a.hreflang),
    ['en', 'es', 'x-default'],
  );
  assert.equal(alternates[0].href, `${SEO_SITE_URL}/stub-up/`);
  assert.equal(alternates[1].href, `${SEO_SITE_URL}/stub-up/?lang=es`);
  assert.equal(alternates[2].href, alternates[0].href);
  assert.deepEqual(buildAlternatesForPath('/nope'), []);
});
