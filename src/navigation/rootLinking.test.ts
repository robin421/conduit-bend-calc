import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getStateFromPath } from '@react-navigation/core';

import type { RootStackParamList } from './rootStack.ts';
import { SEO_TOOL_PAGES } from '../seo/toolPages.ts';
import { rootLinking } from './rootLinking.ts';
import { SEO_TOOL_SCREENS } from './seoRoutes.ts';

interface RouteLike {
  name: string;
  state?: { routes: RouteLike[] };
}

type LinkingConfig = Parameters<typeof getStateFromPath<RootStackParamList>>[1];

const config = rootLinking.config as LinkingConfig;

/** 取解析结果里最内层的屏幕名。 */
function leafScreenName(state: unknown): string | undefined {
  if (!state || typeof state !== 'object') {
    return undefined;
  }
  const routes = (state as { routes?: RouteLike[] }).routes;
  if (!routes || routes.length === 0) {
    return undefined;
  }
  const last = routes[routes.length - 1];
  return last.state ? leafScreenName(last.state) : last.name;
}

test('rootLinking：每个 SEO 工具页路径解析到对应屏幕', () => {
  for (const page of SEO_TOOL_PAGES) {
    const state = getStateFromPath(page.path, config);
    assert.equal(
      leafScreenName(state),
      SEO_TOOL_SCREENS[page.key],
      `${page.path} should resolve to ${SEO_TOOL_SCREENS[page.key]}`,
    );
  }
});

test('rootLinking：带尾斜杠的工具页路径同样解析', () => {
  for (const page of SEO_TOOL_PAGES) {
    const state = getStateFromPath(`${page.path}/`, config);
    assert.equal(leafScreenName(state), SEO_TOOL_SCREENS[page.key]);
  }
});

test('rootLinking：首页解析到 App 的 RootTabs', () => {
  const state = getStateFromPath('/', config);
  assert.equal(leafScreenName(state), 'CalcHome');
});

test('rootLinking：未知路径返回 undefined（回落初始路由）', () => {
  assert.equal(getStateFromPath('/definitely-not-a-route', config), undefined);
});
