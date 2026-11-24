import {
  getPathFromState as defaultGetPathFromState,
  getStateFromPath as defaultGetStateFromPath,
} from '@react-navigation/core';
import type { LinkingOptions } from '@react-navigation/native';

import { localizePath, stripLangPrefix } from '../i18n/lang.ts';
import { getLang } from '../i18n/store.ts';
import type { RootStackParamList } from './rootStackTypes';

type StateWithRoutes = {
  routes?: ReadonlyArray<{
    path?: string;
    state?: StateWithRoutes;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

/**
 * 递归剥离 `defaultGetStateFromPath` 写入在路由上的 `.path` 字符串。
 * React Navigation `useLinking` 挂载时会优先把 `focusedRoute.path` 写回地址栏而跳过
 * `getPathFromState`；剥离后无论冷启动 `/es/<slug>/` 还是运行时 EN↔ES 切换，
 * 地址栏一律由 `getPathFromState` 按当前语言动态生成，不会把 `/es/` 抹掉（DEF-T48-001）。
 */
function stripRoutePaths<T>(state: T): T {
  if (!state || typeof state !== 'object') {
    return state;
  }
  const record = state as StateWithRoutes;
  if (!Array.isArray(record.routes)) {
    return state;
  }
  return {
    ...record,
    routes: record.routes.map((route) => {
      const { path: _ignored, state: childState, ...rest } = route;
      return childState ? { ...rest, state: stripRoutePaths(childState) } : rest;
    }),
  } as T;
}

/**
 * 剥离 Web URL 里的 `/es` 语言前缀（保留 query 与 hash），供 React Navigation 路径解析使用。
 * 例：`/es` → `/`，`/es/offset/` → `/offset/`，`/es/offset?a=1#h` → `/offset?a=1#h`。
 */
export function normalizePathForLinking(path: string): string {
  const hashIdx = path.indexOf('#');
  const hash = hashIdx >= 0 ? path.slice(hashIdx) : '';
  const withoutHash = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
  const queryIdx = withoutHash.indexOf('?');
  const rawPathname = queryIdx >= 0 ? withoutHash.slice(0, queryIdx) : withoutHash;
  const query = queryIdx >= 0 ? withoutHash.slice(queryIdx) : '';
  const stripped = stripLangPrefix(rawPathname);
  return `${stripped}${query}${hash}`;
}

/**
 * 纯配置模块（可被 node --test 直接 import 做路径解析回归）。
 *
 * Web 深链：静态 shell（scripts/gen-seo-tool-shells.ts 与 scripts/inject-web-seo.py）
 * 把 `/offset` 与 `/es/offset`、`/` 与 `/es/` 展开成带独立 meta 的 index.html，
 * SPA 启动后由本配置把中英/西语 URL 都解析成对应屏幕；在西语模式下前端导航也会
 * 自动保留 `/es/` 前缀。prefixes 留空即可：web 端 React Navigation 直接读 location.pathname。
 */
export const rootLinking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  config: {
    screens: {
      RootTabs: {
        screens: {
          CalcHome: {
            screens: {
              CalcHome: '',
            },
          },
        },
      },
      SeoOffset: 'offset',
      SeoStubUp: 'stub-up',
      SeoSaddle3: '3-point-saddle',
      SeoConduitFill: 'conduit-fill',
      SeoSaddle4: '4-point-saddle',
      SeoShrink: 'shrink',
      SeoRollingOffset: 'rolling-offset',
      SeoKicked90: 'kicked-90',
      SeoWireSize: 'wire-size',
      SeoVoltageDrop: 'voltage-drop',
      Feedback: 'feedback',
    },
  },
  getStateFromPath(path, options) {
    const state = defaultGetStateFromPath(normalizePathForLinking(path), options);
    return state ? stripRoutePaths(state) : state;
  },
  getPathFromState(state, options) {
    const raw = defaultGetPathFromState(state, options);
    const lang = getLang();
    if (lang !== 'es') {
      return raw;
    }
    const hashIdx = raw.indexOf('#');
    const hash = hashIdx >= 0 ? raw.slice(hashIdx) : '';
    const withoutHash = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
    const queryIdx = withoutHash.indexOf('?');
    const pathname = queryIdx >= 0 ? withoutHash.slice(0, queryIdx) : withoutHash;
    const query = queryIdx >= 0 ? withoutHash.slice(queryIdx) : '';
    const localized = localizePath(pathname, 'es');
    const withSlash = localized.endsWith('/') ? localized : `${localized}/`;
    return `${withSlash}${query}${hash}`;
  },
};
