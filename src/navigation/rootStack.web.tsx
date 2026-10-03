import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Component,
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
} from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../theme';
import { rootLinking } from './rootLinking';
import type { RootStackParamList } from './rootStackTypes';

export { rootLinking };
export type { RootStackParamList };

/**
 * 单个 lazy 屏的错误边界。
 *
 * lazy chunk 的 promise reject（网络失败 / chunk 内模块初始化抛错）会向父级传播；
 * 如果没有边界，React 会卸载整棵 React 树（#root 变空）。这里把失败限制在
 * 当前屏，并给出可刷新的降级 UI。
 */
class LazyScreenErrorBoundary extends Component<
  { children: ReactNode; backgroundColor: string; textColor: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    // 只记录，不重抛：避免二次 render 再抛导致整树卸载。
    console.error('[LazyScreen] failed to render chunk', error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const { backgroundColor, textColor } = this.props;
      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backgroundColor,
          }}
        >
          <Text style={{ fontSize: 16, textAlign: 'center', color: textColor }}>
            Failed to load this page. Please refresh.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * Web 端按路由代码分割（T62 首屏性能）：
 * - Metro web 会把 `import()` 拆成独立 async chunk；
 * - 4 个 SEO 工具页与内部 App（RootTabs）互不拖累，打开 /offset 时
 *   不会下载 react-native-svg、内购、内部计算器屏等首屏用不到的代码；
 * - 每个 lazy 屏自带 Suspense + ErrorBoundary 边界，切页时只有该屏短暂空白，
 *   单个 chunk 失败也不会拖垮导航容器。
 */
function lazyScreen(
  loader: () => Promise<{ default: ComponentType<any> }>,
): ComponentType<any> {
  const Lazy = lazy(loader);
  return function LazySeoScreen() {
    const theme = useTheme();
    return (
      <LazyScreenErrorBoundary
        backgroundColor={theme.colors.background}
        textColor={theme.colors.textPrimary}
      >
        <Suspense
          fallback={
            <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
          }
        >
          <Lazy />
        </Suspense>
      </LazyScreenErrorBoundary>
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
