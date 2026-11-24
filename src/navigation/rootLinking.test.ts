import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getStateFromPath } from '@react-navigation/core';

import { __resetI18nForTests } from '../i18n/store.ts';
import type { RootStackParamList } from './rootStack.ts';
import { SEO_TOOL_PAGES } from '../seo/toolPages.ts';
import { normalizePathForLinking, rootLinking } from './rootLinking.ts';
import { SEO_TOOL_SCREENS } from './seoRoutes.ts';

interface RouteLike {
  name: string;
  path?: string;
  state?: { routes: RouteLike[] };
}

/** 递归收集状态树里所有 route 的 `.path` 字段（回归断言用）。 */
function collectRoutePaths(state: unknown): Array<string | undefined> {
  if (!state || typeof state !== 'object') {
    return [];
  }
  const routes = (state as { routes?: RouteLike[] }).routes;
  if (!routes) {
    return [];
  }
  const out: Array<string | undefined> = [];
  for (const route of routes) {
    out.push(route.path);
    if (route.state) {
      out.push(...collectRoutePaths(route.state));
    }
  }
  return out;
}

type LinkingConfig = Parameters<typeof getStateFromPath<RootStackParamList>>[1];

const config = rootLinking.config as LinkingConfig;
const parsePath = (path: string) =>
  rootLinking.getStateFromPath
    ? rootLinking.getStateFromPath(path, config)
    : getStateFromPath(path, config);

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
  assert.equal(parsePath('/definitely-not-a-route'), undefined);
  assert.equal(parsePath('/es/definitely-not-a-route'), undefined);
});

test('rootLinking：/es 与 /es/<slug>（含尾斜杠）解析到完全相同的屏幕', () => {
  assert.equal(normalizePathForLinking('/es'), '/');
  assert.equal(normalizePathForLinking('/es/'), '/');
  assert.equal(normalizePathForLinking('/es/offset/?foo=1#top'), '/offset/?foo=1#top');

  assert.equal(leafScreenName(parsePath('/es')), 'CalcHome');
  assert.equal(leafScreenName(parsePath('/es/')), 'CalcHome');

  for (const page of SEO_TOOL_PAGES) {
    assert.equal(
      leafScreenName(parsePath(`/es${page.path}`)),
      SEO_TOOL_SCREENS[page.key],
      `/es${page.path} should resolve to ${SEO_TOOL_SCREENS[page.key]}`,
    );
    assert.equal(
      leafScreenName(parsePath(`/es${page.path}/`)),
      SEO_TOOL_SCREENS[page.key],
      `/es${page.path}/ should resolve to ${SEO_TOOL_SCREENS[page.key]}`,
    );
  }
});

test('rootLinking.getPathFromState：西语模式下导航自动保留 /es/ 前缀（全部 10 个工具 + 首页）', () => {
  assert.ok(rootLinking.getPathFromState);
  try {
    __resetI18nForTests('en');
    const stubState = parsePath('/stub-up');
    assert.ok(stubState);
    assert.equal(rootLinking.getPathFromState(stubState, config), '/stub-up');

    __resetI18nForTests('es');
    const homeState = parsePath('/es/');
    assert.ok(homeState);
    assert.equal(rootLinking.getPathFromState(homeState, config), '/es/');

    for (const page of SEO_TOOL_PAGES) {
      const state = parsePath(`/es${page.path}/`);
      assert.ok(state, `/es${page.path}/ should produce navigation state`);
      // DEF-T48-001 回归：不得在 route.path 残留剥离后的英语路径（如 '/offset'），
      // 否则 useLinking 挂载时会直接 replaceState 抹掉 /es/ 前缀。
      for (const routePath of collectRoutePaths(state)) {
        assert.equal(
          routePath,
          undefined,
          `/es${page.path}/ must not leave stale route.path=${String(routePath)}`,
        );
      }
      assert.equal(
        rootLinking.getPathFromState(state, config),
        `/es${page.path}/`,
        `getPathFromState under es for ${page.slug} should return /es${page.path}/`,
      );
    }

    // 带 query 参数时同时保留 /es/<slug>/ 与 query
    const utmState = parsePath('/es/offset/?utm_source=google');
    assert.ok(utmState);
    assert.equal(
      rootLinking.getPathFromState(utmState, config),
      '/es/offset/?utm_source=google',
    );
  } finally {
    __resetI18nForTests('en');
  }
});
