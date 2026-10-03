import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './rootStackTypes';

/**
 * 纯配置模块（只依赖类型，可被 node --test 直接 import 做路径解析回归）。
 *
 * Web 深链：静态 shell（scripts/gen-seo-tool-shells.ts）把 /offset 等路径
 * 展开成带独立 meta 的 index.html，SPA 启动后由本配置把 URL 解析成
 * 对应屏幕。prefixes 留空即可：web 端 React Navigation 直接读 location.pathname。
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
      SeoSaddle4: '4-point-saddle',
      SeoShrink: 'shrink',
      SeoStubUp: 'stub-up',
    },
  },
};
