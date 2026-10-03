import { useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { trackInternalLinkClick } from '../lib/analytics';
import type { RootStackParamList } from '../navigation/rootStackTypes';
import {
  CALCULATOR_NAV,
  DRAWER_ANIMATION_MS,
  drawerWidthForViewport,
  type CalculatorNavItem,
} from '../seo/calculatorNav';
import { useTheme } from '../theme';
import WattFlowBrandBar from './wattflowBrandBar';

/** react-native-web 的 Text 支持 href（渲染为 <a>）；RN 类型未收录，做一次断言。 */
const AnchorText = Text as unknown as ComponentType<
  ComponentProps<typeof Text> & { href?: string }
>;

interface CalculatorDrawerProps {
  /** 是否展开；false 时先播完滑出动画再卸载。 */
  visible: boolean;
  /** 当前页 key，用于高亮。 */
  activeKey: string;
  onClose: () => void;
}

/**
 * 移动端左侧抽屉导航（<600pt 时取代横向切换条）。
 *
 * SEO / 可访问性：
 * - 非当前项在 Web 端渲染真实 <a href>，保证爬虫可抓取；Native 端走 navigate；
 * - 当前项渲染为带 selected 语义的静态项（不自链接）；
 * - 遮罩与 X 均可关闭，Web 端额外支持 ESC。
 *
 * 视觉遵守项目规范：无阴影、无渐变；抽屉与内容区之间用 1px 主题描边分隔。
 */
export default function CalculatorDrawer({
  visible,
  activeKey,
  onClose,
}: CalculatorDrawerProps) {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const drawerWidth = drawerWidthForViewport(width);

  // mounted 与 visible 分开：关闭时先播动画，结束后再卸载，避免瞬间消失。
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: DRAWER_ANIMATION_MS,
      // 300ms ease-out；native 走原生驱动，web 由 react-native-web 处理。
      easing: Easing.out(Easing.ease),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
      }
    });
    return () => {
      animation.stop();
    };
  }, [mounted, visible, progress]);

  // Web：ESC 关闭（桌面端调试用）。
  useEffect(() => {
    if (!mounted || Platform.OS !== 'web') {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mounted, onClose]);

  // Web：抽屉打开期间锁住 body 滚动（页面 ScrollView 的 scrollEnabled 另有一层）。
  useEffect(() => {
    if (!mounted || Platform.OS !== 'web') {
      return;
    }
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previous;
    };
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const handlePressItem = (item: CalculatorNavItem) => {
    trackInternalLinkClick(activeKey, item.key);
    onClose();
    // Web 端交给真实 <a href> 做 SPA 跳转；Native 端显式 navigate。
    if (Platform.OS !== 'web') {
      navigation.navigate(item.screen);
    }
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        {/* 半透明黑色遮罩：点击关闭 */}
        <Animated.View
          style={[
            styles.scrim,
            { backgroundColor: 'rgba(0,0,0,0.5)', opacity: progress },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close calculator menu"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* 左侧面板：translateX 滑入 / 滑出 */}
        <Animated.View
          style={[
            styles.panel,
            {
              width: drawerWidth,
              backgroundColor: theme.colors.background,
              borderRightColor: theme.colors.border,
              transform: [{ translateX }],
            },
          ]}
        >
          <View
            style={[
              styles.header,
              {
                borderBottomColor: theme.colors.border,
                paddingHorizontal: theme.spacing.sm,
              },
            ]}
          >
            <View style={styles.brand}>
              <WattFlowBrandBar />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close calculator menu"
              onPress={onClose}
              hitSlop={8}
              style={styles.closeButton}
            >
              <Text
                style={[styles.closeGlyph, { color: theme.colors.textPrimary }]}
              >
                {'\u2715'}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.menu}
            showsVerticalScrollIndicator={false}
          >
            {CALCULATOR_NAV.map((item) => {
              const active = item.key === activeKey;
              const label = (
                <Text
                  style={{
                    color: active
                      ? theme.colors.accentText
                      : theme.colors.textPrimary,
                    fontSize: theme.fontSize.body,
                    fontWeight: active
                      ? theme.fontWeight.semibold
                      : theme.fontWeight.regular,
                  }}
                >
                  {item.label}
                </Text>
              );
              const itemStyle = [
                styles.menuItem,
                {
                  borderLeftColor: active ? theme.colors.accent : 'transparent',
                  backgroundColor: active ? theme.colors.card : 'transparent',
                },
              ];

              if (active) {
                return (
                  <View
                    key={item.key}
                    accessibilityState={{ selected: true }}
                    style={itemStyle}
                  >
                    {label}
                  </View>
                );
              }
              if (Platform.OS === 'web') {
                return (
                  <AnchorText
                    key={item.key}
                    href={item.path}
                    onPress={() => handlePressItem(item)}
                    style={itemStyle}
                  >
                    {label}
                  </AnchorText>
                );
              }
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  onPress={() => handlePressItem(item)}
                  style={itemStyle}
                >
                  {label}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRightWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    fontSize: 18,
    lineHeight: 22,
  },
  menu: {
    paddingVertical: 4,
  },
  menuItem: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderLeftWidth: 3,
  },
});
