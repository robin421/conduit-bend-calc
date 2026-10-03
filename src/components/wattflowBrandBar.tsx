import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BRAND_COLOR, PRODUCT_NAME, WATTFLOW_LOGO, WATTFLOW_NAME } from '../seo/brand';
import { useTheme } from '../theme';

/**
 * 统一品牌栏：⚡ logo + WattFlow 字样 + Conduit Bend Calc 产品名。
 *
 * 两种色调：
 * - `surface`（默认）：浅底内容区用，用于 4 个 SEO 工具页顶部；
 * - `header`：炭黑导航头内用（CalcStack 的自定义 headerTitle），
 *   文字改用 onPrimary，保证在深底上可读。
 *
 * 移动端（<600pt）：传入 `onMenuPress` 时在品牌文字之前插入汉堡按钮（☰），
 * 品牌文案本身保持不变。按钮布局高度仍是 28pt，靠 hitSlop 补足触控区。
 *
 * 高度刻意压到 36pt 以内，给 390px 首屏的「输入 → 计算 → 结果」留预算。
 */
export default function WattFlowBrandBar({
  tone = 'surface',
  onMenuPress,
}: {
  tone?: 'surface' | 'header';
  /** 移动端提供后渲染左侧汉堡按钮；缺省（桌面端）不渲染。 */
  onMenuPress?: () => void;
}) {
  const theme = useTheme();
  const headerTone = tone === 'header';
  const wordmarkColor = headerTone ? theme.colors.onPrimary : theme.colors.textPrimary;
  const productColor = headerTone ? 'rgba(255,255,255,0.72)' : theme.colors.textSecondary;
  const separatorColor = headerTone ? 'rgba(255,255,255,0.32)' : theme.colors.border;

  return (
    <View
      accessibilityRole="header"
      accessibilityLabel={`${WATTFLOW_NAME} ${PRODUCT_NAME}`}
      style={styles.bar}
    >
      {onMenuPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open calculator menu"
          onPress={onMenuPress}
          hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
          style={styles.menuButton}
        >
          <Text style={[styles.menuGlyph, { color: wordmarkColor }]}>\u2630</Text>
        </Pressable>
      ) : null}
      <View style={styles.logo}>
        <Text style={styles.logoGlyph}>{WATTFLOW_LOGO}</Text>
      </View>
      <Text style={[styles.wordmark, { color: wordmarkColor }]}>{WATTFLOW_NAME}</Text>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.separator, { color: separatorColor }]}
      >
        |
      </Text>
      <Text numberOfLines={1} style={[styles.product, { color: productColor }]}>
        {PRODUCT_NAME}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 28,
  },
  menuButton: {
    minHeight: 28,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuGlyph: {
    fontSize: 18,
    lineHeight: 22,
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlyph: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
  },
  wordmark: {
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    fontSize: 14,
  },
  product: {
    fontSize: 13,
    flexShrink: 1,
  },
});
