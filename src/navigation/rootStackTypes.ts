import type { NavigatorScreenParams } from '@react-navigation/native';

import type { RootTabParamList } from './rootTabs';

/**
 * 根导航参数表（单独成文件，供 native / web 两份 rootStack 与 rootLinking 共用，
 * 避免 web 端 lazy 版本为了取一个类型而把 native 静态版本一并拉进 bundle）。
 */
export type RootStackParamList = {
  RootTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  SeoOffset: undefined;
  SeoSaddle4: undefined;
  SeoShrink: undefined;
  SeoStubUp: undefined;
};
