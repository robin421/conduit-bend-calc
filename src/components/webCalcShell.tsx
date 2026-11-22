import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useI18n } from '../i18n';
import type { CalcStackParamList } from '../navigation/calcStack';
import {
  isMobileNavViewport,
  isWideDesktopViewport,
  workspaceMaxWidth,
} from '../seo/calculatorNav';
import { useTheme } from '../theme';

export interface WebBreadcrumbBarProps {
  title: string;
  backLabel?: string;
  onBack?: () => void;
}

/**
 * Web 桌面端（>=600px）40px 浅白二级面包屑条，与 SeoPage 切换条同构。
 */
export function WebBreadcrumbBar({
  title,
  backLabel,
  onBack,
}: WebBreadcrumbBarProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const resolvedBackLabel = backLabel ?? t('nav.home');
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NavigationProp<CalcStackParamList>>();

  if (Platform.OS !== 'web' || isMobileNavViewport(width)) {
    return null;
  }

  const wideDesktop = isWideDesktopViewport(width);
  const maxWidth = workspaceMaxWidth(width);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigation.navigate('CalcHome');
  };

  return (
    <View
      style={[
        styles.breadcrumbBar,
        {
          backgroundColor: theme.colors.card,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.breadcrumbInner,
          {
            maxWidth,
            paddingHorizontal: wideDesktop ? 24 : theme.spacing.md,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={resolvedBackLabel}
          onPress={handleBack}
          style={(state) => {
            const { hovered, focused } = state as {
              hovered?: boolean;
              focused?: boolean;
            };
            return [
              styles.backLink,
              { borderRadius: theme.radius },
              hovered ? { backgroundColor: theme.colors.background } : null,
              focused
                ? ({
                    outlineStyle: 'solid',
                    outlineWidth: 2,
                    outlineColor: theme.colors.accentText,
                  } as object)
                : null,
            ];
          }}
        >
          <Text
            style={{
              color: theme.colors.primaryText,
              fontSize: theme.fontSize.secondary,
              fontWeight: theme.fontWeight.semibold,
            }}
          >
            {'← '}
            {resolvedBackLabel}
          </Text>
        </Pressable>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
          }}
        >
          /
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.secondary,
            fontWeight: theme.fontWeight.semibold,
            flexShrink: 1,
          }}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

export interface WebCalcShellProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  /** Native 与窄屏的默认间距令牌，保持与原屏零回归。 */
  spacing?: 'sm' | 'md';
  /** 单栏居中页面（如 Calibration / Bender）在 Web PC 下的最大宽度。 */
  singleColumnMaxWidth?: number;
  onBack?: () => void;
}

/**
 * 计算器页面响应式外壳：
 * - Native 与 Mobile Web（<600px）：直接透传单列 ScrollView，行为与布局零回归；
 * - Web >=600px：顶部渲染 40px 浅白面包屑条；
 * - Web >=1024px（PC 宽屏）：放宽至 1120px，若提供 left + right 则渲染 52% / 48% 双栏（右侧 sticky）。
 */
export default function WebCalcShell({
  title,
  left,
  right,
  children,
  spacing = 'sm',
  singleColumnMaxWidth,
  onBack,
}: WebCalcShellProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const pad = spacing === 'md' ? theme.spacing.md : theme.spacing.sm;
  const gap = pad;

  if (Platform.OS !== 'web' || isMobileNavViewport(width)) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[
          styles.singleContent,
          { padding: pad, gap },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {left}
        {right}
        {children}
      </ScrollView>
    );
  }

  const wideDesktop = isWideDesktopViewport(width);
  const hasTwoColumns = Boolean(left && right);
  const maxWidth = wideDesktop
    ? hasTwoColumns
      ? workspaceMaxWidth(width)
      : (singleColumnMaxWidth ?? workspaceMaxWidth(width))
    : workspaceMaxWidth(width);

  return (
    <View style={[styles.webRoot, { backgroundColor: theme.colors.background }]}>
      <WebBreadcrumbBar title={title} onBack={onBack} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.webScrollContent,
          {
            maxWidth,
            padding: wideDesktop ? 24 : pad,
            gap: wideDesktop ? theme.spacing.md : gap,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {wideDesktop && hasTwoColumns ? (
          <>
            <View style={styles.columnsRow}>
              <View style={[styles.leftCol, { gap: theme.spacing.md }]}>{left}</View>
              <View style={[styles.rightCol, styles.stickyWeb, { gap: theme.spacing.md }]}>
                {right}
              </View>
            </View>
            {children}
          </>
        ) : (
          <>
            {left}
            {right}
            {children}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  breadcrumbBar: {
    height: 40,
    width: '100%',
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  breadcrumbInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    alignSelf: 'center',
    height: 40,
  },
  backLink: {
    minHeight: 32,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  singleContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  webScrollContent: {
    flexGrow: 1,
    width: '100%',
    alignSelf: 'center',
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    width: '100%',
  },
  leftCol: {
    flex: 52,
    minWidth: 0,
  },
  rightCol: {
    flex: 48,
    minWidth: 0,
  },
  stickyWeb: {
    position: 'sticky' as unknown as 'relative',
    top: 24,
  },
});
