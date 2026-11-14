import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BRAND_COLOR,
  BRAND_FOOTER,
  PRODUCT_NAME,
  TITLE_SUFFIX,
  WATTFLOW_LOGO,
  WATTFLOW_NAME,
  withBrandTitle,
} from './brand.ts';
import { SEO_TOOL_PAGES } from './toolPages.ts';

test('产品名固定且品牌强调色与应用图标一致', () => {
  assert.equal(WATTFLOW_NAME, 'WattFlow');
  assert.equal(WATTFLOW_LOGO, '⚡');
  assert.equal(PRODUCT_NAME, 'Conduit Bend Calc');
  assert.equal(BRAND_COLOR, '#F4C317');
  assert.match(BRAND_FOOTER, /field crews/);
});

test('withBrandTitle 追加统一后缀', () => {
  assert.equal(TITLE_SUFFIX, ' | WattFlow');
  assert.equal(
    withBrandTitle('Conduit Offset Calculator'),
    'Conduit Offset Calculator | WattFlow',
  );
});

test('withBrandTitle 幂等：已带后缀不会重复追加', () => {
  const once = withBrandTitle('Conduit Shrink Calculator');
  assert.equal(withBrandTitle(once), once);
  assert.equal(once, 'Conduit Shrink Calculator | WattFlow');
});

test('withBrandTitle 去除首尾空白', () => {
  assert.equal(withBrandTitle('  Shrink  '), 'Shrink | WattFlow');
});

test('4 个 SEO 工具页 title 带品牌后缀且 ≤ 60 字符', () => {
  for (const page of SEO_TOOL_PAGES) {
    assert.ok(
      page.title.endsWith('| WattFlow'),
      `${page.key} title missing WattFlow suffix: ${page.title}`,
    );
    assert.ok(
      page.title.length <= 60,
      `${page.key} branded title ${page.title.length} > 60: ${page.title}`,
    );
  }
});
