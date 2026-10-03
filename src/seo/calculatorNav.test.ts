import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SEO_TOOL_SCREENS } from '../navigation/seoRoutes.ts';
import { CALCULATOR_NAV, isActiveCalculator } from './calculatorNav.ts';
import { SEO_TOOL_PAGES } from './toolPages.ts';

test('切换条 = 4 个交互式工具页 + 回首页入口', () => {
  assert.equal(CALCULATOR_NAV.length, SEO_TOOL_PAGES.length + 1);
  assert.equal(CALCULATOR_NAV[CALCULATOR_NAV.length - 1].key, 'home');
  assert.equal(CALCULATOR_NAV[CALCULATOR_NAV.length - 1].path, '/');
  assert.equal(CALCULATOR_NAV[CALCULATOR_NAV.length - 1].screen, 'RootTabs');
});

test('每个工具项的 path / screen 与 toolPages / seoRoutes 单一来源一致', () => {
  for (const page of SEO_TOOL_PAGES) {
    const item = CALCULATOR_NAV.find((nav) => nav.key === page.key);
    assert.ok(item, `missing switcher item for ${page.key}`);
    assert.equal(item.path, page.path);
    assert.equal(item.screen, SEO_TOOL_SCREENS[page.key]);
    assert.ok(item.label.length > 0);
  }
});

test('切换条 key 唯一', () => {
  const keys = CALCULATOR_NAV.map((item) => item.key);
  assert.equal(new Set(keys).size, keys.length);
});

test('isActiveCalculator 只对相同 key 返回 true', () => {
  assert.equal(isActiveCalculator('offset', 'offset'), true);
  assert.equal(isActiveCalculator('offset', 'shrink'), false);
});
