import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { lazy, Suspense, type ComponentType } from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme';
import { rootLinking } from './rootLinking';
import type { RootStackParamList } from './rootStackTypes';

export { rootLinking };
export type { RootStackParamList };

/**
 * Web 端按路由代码分割（T62 首屏性能）：
 * - Metro web 会把 `import()` 拆成独立 async chunk；
 * - 4 个 SEO 工具页与内部 App（RootTabs）互不拖累，打开 /offset 时
 *   不会下载 react-native-svg、内购、内部计算器屏等首屏用不到的代码；
 * - 每个 lazy 屏自带 Suspense 边界，切页时只有该屏短暂空白，导航容器不卸载。
 */
function lazyScreen(
  loader: () => Promise<{ default: ComponentType<any> }>,
): ComponentType<any> {
  const Lazy = lazy(loader);
  return function LazySeoScreen() {
    const theme = useTheme();
    return (
      <Suspense
        fallback={
          <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
        }
      >
        <Lazy />
      </Suspense>
    );
  };
}

const RootTabsScreen = lazyScreen(() => import('./rootTabs'));
const OffsetToolScreen = lazyScreen(
  () => import('../screens/seoTools/offsetToolScreen'),
);
const FourPointSaddleToolScreen = lazyScreen(
  () => import('../screens/seoTools/fourPointSaddleToolScreen'),
);
const ShrinkToolScreen = lazyScreen(
  () => import('../screens/seoTools/shrinkToolScreen'),
);
const StubUpToolScreen = lazyScreen(
  () => import('../screens/seoTools/stubUpToolScreen'),
);

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="RootTabs"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="RootTabs" component={RootTabsScreen} />
      <Stack.Screen name="SeoOffset" component={OffsetToolScreen} />
      <Stack.Screen name="SeoSaddle4" component={FourPointSaddleToolScreen} />
      <Stack.Screen name="SeoShrink" component={ShrinkToolScreen} />
      <Stack.Screen name="SeoStubUp" component={StubUpToolScreen} />
    </Stack.Navigator>
  );
}
