import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SEO_TOOL_SCREENS } from '../navigation/seoRoutes.ts';
import {
  CALCULATOR_NAV,
  DESKTOP_WIDE_BREAKPOINT,
  DRAWER_ANIMATION_MS,
  DRAWER_MAX_WIDTH,
  DRAWER_WIDTH_RATIO,
  MOBILE_NAV_BREAKPOINT,
  calculatorNavMode,
  drawerWidthForViewport,
  isActiveCalculator,
  isMobileNavViewport,
  isWideDesktopViewport,
  workspaceMaxWidth,
} from './calculatorNav.ts';
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

test('响应式断点：<600pt 移动端抽屉，>=600pt 横向切换条', () => {
  assert.equal(MOBILE_NAV_BREAKPOINT, 600);
  // 移动端（汉堡 + 抽屉）
  assert.equal(isMobileNavViewport(320), true);
  assert.equal(isMobileNavViewport(390), true);
  assert.equal(isMobileNavViewport(599), true);
  // 桌面端（横向切换条）
  assert.equal(isMobileNavViewport(600), false);
  assert.equal(isMobileNavViewport(768), false);
  assert.equal(isMobileNavViewport(1440), false);
});

test('导航模式：<600pt 渲染汉堡 + 抽屉，>=600pt 渲染横条', () => {
  assert.equal(calculatorNavMode(320), 'drawer');
  assert.equal(calculatorNavMode(390), 'drawer');
  assert.equal(calculatorNavMode(599), 'drawer');
  assert.equal(calculatorNavMode(600), 'switcher');
  assert.equal(calculatorNavMode(768), 'switcher');
  assert.equal(calculatorNavMode(1440), 'switcher');
});

test('抽屉宽度：不超过 280pt，且不超过屏幕 85%', () => {
  assert.equal(DRAWER_MAX_WIDTH, 280);
  assert.equal(DRAWER_WIDTH_RATIO, 0.85);
  // 常见手机宽度：封顶 280
  assert.equal(drawerWidthForViewport(390), 280);
  assert.equal(drawerWidthForViewport(360), 280);
  // 更窄的设备：按 85% 收缩
  assert.equal(drawerWidthForViewport(320), 272);
  assert.equal(drawerWidthForViewport(240), 204);
  // 非法 / 0 宽退化到默认宽度
  assert.equal(drawerWidthForViewport(0), 280);
  assert.equal(drawerWidthForViewport(Number.NaN), 280);
});

test('抽屉动画时长 300ms', () => {
  assert.equal(DRAWER_ANIMATION_MS, 300);
});

test('宽屏工作区断点：>=1024pt 返回 true 且最大宽度 1120，否则 720', () => {
  assert.equal(DESKTOP_WIDE_BREAKPOINT, 1024);
  assert.equal(isWideDesktopViewport(390), false);
  assert.equal(isWideDesktopViewport(600), false);
  assert.equal(isWideDesktopViewport(1023), false);
  assert.equal(isWideDesktopViewport(1024), true);
  assert.equal(isWideDesktopViewport(1440), true);
  assert.equal(isWideDesktopViewport(Number.NaN), false);

  assert.equal(workspaceMaxWidth(390), 720);
  assert.equal(workspaceMaxWidth(1023), 720);
  assert.equal(workspaceMaxWidth(1024), 1120);
  assert.equal(workspaceMaxWidth(1440), 1120);
  assert.equal(workspaceMaxWidth(Number.NaN), 720);
});
