import { useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type PressableStateCallbackType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppBrandBar from '../../components/appBrandBar';
import CalculatorDrawer from '../../components/calculatorDrawer';
import LanguageSwitcher from '../../components/languageSwitcher';
import { CopyIcon, MenuIcon } from '../../components/toolIcons';
import { useI18n } from '../../i18n';
import {
  buildCalculatorNavHref,
  CALCULATOR_NAV,
  calculatorNavMode,
  isWideDesktopViewport,
  workspaceMaxWidth,
  type CalculatorNavItem,
} from '../../seo/calculatorNav';
import { OFFSET_ANGLES, OFFSET_CONSTANTS, TAKE_UP_OPTIONS } from '../../constants';
import type { OffsetAngle } from '../../constants';
import type { RootStackParamList } from '../../navigation/rootStack';
import { SEO_TOOL_SCREENS, type SeoScreenName } from '../../navigation/seoRoutes';
import { buildRelatedLinks, getRelatedCalculatorsTitle, type SeoToolKey, type SeoToolPageMeta } from '../../seo/toolPages';
import {
  trackEvent,
  trackInternalLinkClick,
  trackSeoToolCopy,
  trackSeoToolFaqExpand,
  trackSeoToolHistoryRefill,
  trackSeoToolPreset,
  trackSeoToolUnitChange,
  type CalculatorSlug,
  type SeoToolName,
} from '../../lib/analytics';
import { logAmplitudeEvent, trackAmplitudeActivationIfNeeded } from '../../lib/amplitude';
import { copyToClipboard } from '../../lib/clipboard';
import { buildGooglePlayUrl } from '../../lib/homeContent';
import type { SeoHistoryEntry } from '../../lib/seoHistory';
import { formatLength, type UnitSystem } from '../../lib/units';
import { useDebouncedCalculationCompleted } from '../../lib/useDebouncedCalculationCompleted';
import { useTheme, type Theme } from '../../theme';

/** Web 端无阴影 Hover / Focus-visible 样式辅助。 */
function webFocusHoverStyle(
  state: PressableStateCallbackType,
  theme: Theme,
  options?: { darkSurface?: boolean; hoverBorder?: string; hoverBg?: string },
): ViewStyle | null {
  if (Platform.OS !== 'web') {
    return null;
  }
  const { hovered, focused } = state as { hovered?: boolean; focused?: boolean };
  const style: Record<string, unknown> = {};
  if (hovered) {
    if (options?.hoverBorder) style.borderColor = options.hoverBorder;
    if (options?.hoverBg) style.backgroundColor = options.hoverBg;
  }
  if (focused) {
    style.outlineStyle = 'solid';
    style.outlineWidth = 2;
    style.outlineColor = options?.darkSurface
      ? theme.colors.accent
      : theme.colors.accentText;
  }
  return Object.keys(style).length > 0 ? (style as ViewStyle) : null;
}

/** react-native-web 的 Text 支持 href（渲染为 <a>）；RN 类型未收录，做一次断言。 */
const AnchorText = Text as unknown as ComponentType<
  ComponentProps<typeof Text> & {
    href?: string;
    hrefAttrs?: { target?: string; rel?: string };
  }
>;

/* ------------------------------------------------------------------ */
/* 页面骨架                                                            */
/* ------------------------------------------------------------------ */

/** 移动优先内容容器：maxWidth 720 居中，无阴影/渐变。 */
export function SeoPage({
  children,
  activeTool,
}: {
  children: ReactNode;
  /** 当前工具页 key；提供后自动渲染 WattFlow 品牌栏 + 计算器导航 + 页脚。 */
  activeTool?: SeoToolKey;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // 响应式断点：<600pt 汉堡 + 抽屉，>=600pt 横向切换条；>=1024pt 宽屏 1120px。
  const mobileNav = calculatorNavMode(width) === 'drawer';
  const wideDesktop = Platform.OS === 'web' && isWideDesktopViewport(width);
  const maxWidth = Platform.OS === 'web' ? workspaceMaxWidth(width) : 720;
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 从移动端切到桌面端时自动收起抽屉，避免遗留遮罩。
  useEffect(() => {
    if (!mobileNav && drawerOpen) {
      setDrawerOpen(false);
    }
  }, [mobileNav, drawerOpen]);

  const headerTopInset = Platform.OS === 'web' ? 0 : insets.top;
  const headerHeight = (mobileNav ? 52 : 56) + headerTopInset;

  return (
    <View
      style={[styles.pageRoot, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.topHeaderBar,
          {
            backgroundColor: theme.colors.primary,
            minHeight: headerHeight,
            paddingTop: headerTopInset,
          },
        ]}
      >
        <View
          style={[
            styles.topHeaderInner,
            {
              maxWidth,
              paddingHorizontal: wideDesktop ? 24 : theme.spacing.md,
              height: mobileNav ? 52 : 56,
            },
          ]}
        >
          <AppBrandBar tone="header" />
          <View style={styles.topHeaderRight}>
            <LanguageSwitcher tone="header" />
            {activeTool && mobileNav ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('brand.menuLabel')}
                onPress={() => setDrawerOpen(true)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                style={(state) => [
                  styles.headerMenuButton,
                  { borderRadius: theme.radius },
                  webFocusHoverStyle(state, theme, {
                    darkSurface: true,
                    hoverBg: 'rgba(255,255,255,0.12)',
                  }),
                ]}
              >
                <MenuIcon size={20} color={theme.colors.onPrimary} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      {activeTool && !mobileNav ? (
        <CalculatorSwitcher activeKey={activeTool} maxWidth={maxWidth} wideDesktop={wideDesktop} />
      ) : null}
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[
          styles.page,
          {
            maxWidth,
            paddingHorizontal: wideDesktop ? 24 : theme.spacing.sm,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.xl,
            // 8pt 网格：区块之间 16pt 呼吸感（T66 移动端间距）。
            gap: theme.spacing.md,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        // 抽屉打开时禁止背景滚动（Web 端另有 body overflow 兜底）。
        scrollEnabled={!drawerOpen}
      >
        {children}
        <SeoFooter />
      </ScrollView>
      {activeTool ? (
        <CalculatorDrawer
          visible={mobileNav && drawerOpen}
          activeKey={activeTool}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}
    </View>
  );
}

/**
 * WattFlow 页脚：把「这是 WattFlow 的一个整体产品」说到最后一行。
 */
export function SeoFooter() {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.footer, { gap: theme.spacing.sm }]}>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: 12,
          textAlign: 'center',
        }}
      >
        {t('brand.footer')}
      </Text>
      <LanguageSwitcher />
    </View>
  );
}

/**
 * 计算器切换条（仅桌面端 >=600pt 渲染）：把所有工具页串成一个整体。
 * - 平铺换行；当前页橙色下划线 + 深橙文字，其余灰色；
 * - Web 端渲染真实 <a href> 可抓取。
 * - 移动端（<600pt）改用 AppBrandBar 的汉堡按钮 + CalculatorDrawer。
 */
export function CalculatorSwitcher({
  activeKey,
  maxWidth = 720,
  wideDesktop = false,
}: {
  activeKey: string;
  maxWidth?: number;
  wideDesktop?: boolean;
}) {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const renderItem = (item: CalculatorNavItem, active: boolean) => {
    const text = (
      <Text
        style={{
          color: active ? theme.colors.textPrimary : theme.colors.textSecondary,
          fontSize: 13,
          fontWeight: active
            ? theme.fontWeight.semibold
            : theme.fontWeight.medium,
        }}
      >
        {t(item.labelKey)}
      </Text>
    );

    const underline = active ? (
      <View
        style={[
          styles.switcherUnderline,
          { backgroundColor: theme.colors.accent },
        ]}
      />
    ) : null;

    if (active) {
      return (
        <View
          key={item.key}
          style={styles.switcherChip}
          accessibilityState={{ selected: true }}
        >
          {text}
          {underline}
        </View>
      );
    }
    if (Platform.OS === 'web') {
      return (
        <View key={item.key} style={styles.switcherChip}>
          <AnchorText
            href={buildCalculatorNavHref(item.path, lang)}
            onPress={(event: unknown) => {
              const e = event as {
                preventDefault?: () => void;
                metaKey?: boolean;
                ctrlKey?: boolean;
                shiftKey?: boolean;
                altKey?: boolean;
              } | null;
              trackInternalLinkClick(activeKey, item.key);
              logAmplitudeEvent('seo_nav_clicked', {
                target: item.key,
                source: 'calculator_switcher',
              });
              if (e && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                e.preventDefault?.();
                navigation.navigate(item.screen);
              }
            }}
            style={styles.switcherLink}
          >
            {text}
          </AnchorText>
        </View>
      );
    }
    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        onPress={() => {
          trackInternalLinkClick(activeKey, item.key);
          logAmplitudeEvent('seo_nav_clicked', {
            target: item.key,
            source: 'calculator_switcher',
          });
          navigation.navigate(item.screen);
        }}
        style={styles.switcherChip}
      >
        {text}
      </Pressable>
    );
  };

  const items = CALCULATOR_NAV.map((item) =>
    renderItem(item, item.key === activeKey),
  );

  return (
    <View
      style={[
        styles.subNavBar,
        {
          backgroundColor: theme.colors.card,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.switcherWrap,
          {
            maxWidth,
            paddingHorizontal: wideDesktop ? 24 : theme.spacing.md,
          },
        ]}
      >
        {items}
      </View>
    </View>
  );
}

/**
 * 工作区容器：把「输入 + 结果」包成一个视觉块，与下方参考内容（L3/L4）分隔。
 * 白底 + 描边，配合下方浅灰参考区形成「前线 vs 参考」的对比。
 */
export function SeoWorkspace({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.workspace,
        {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
          borderRadius: theme.radius + 2,
          padding: theme.spacing.sm,
          // 输入卡与结果卡之间留出 16pt，避免挤成一团。
          gap: theme.spacing.md,
        },
      ]}
    >
      {children}
    </View>
  );
}

interface SeoHeadingProps {
  level: 1 | 2 | 3;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}

/**
 * 语义化标题：Web 端渲染 role="heading" + aria-level，
 * 让屏幕阅读器与抓取工具识别 h1/h2/h3 层级（SPA 内做到的最好程度）。
 */
export function SeoHeading({ level, children, style }: SeoHeadingProps) {
  const theme = useTheme();
  const fontSize = level === 1 ? 24 : level === 2 ? 20 : 16;
  const domProps =
    Platform.OS === 'web'
      ? ({ role: 'heading', 'aria-level': level } as object)
      : {};
  return (
    <Text
      {...(domProps as object)}
      style={[
        {
          color: theme.colors.textPrimary,
          fontSize,
          fontWeight: theme.fontWeight.semibold,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function SeoCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius,
          padding: theme.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SeoSection({
  title,
  children,
  style,
}: {
  title: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[{ gap: theme.spacing.md }, style]}>
      <SeoHeading level={2} style={styles.sectionTitle}>
        {title}
      </SeoHeading>
      {children}
    </View>
  );
}

/**
 * L3 参考区（倍数表 / 说明文字）：浅灰背景 + 小一号灰色标题 + 默认折叠。
 *
 * 折叠用条件渲染实现（不展开就不占 DOM），刻意让参考内容在首屏彻底消失；
 * 页面级 SEO 内容由 FAQ JSON-LD 与静态落地页承担。
 */
export function SeoCollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View
      style={[
        styles.referenceSection,
        styles.readingMeasure,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((previous) => !previous)}
        style={(state) => [
          styles.referenceHeader,
          webFocusHoverStyle(state, theme, {
            hoverBg: theme.colors.background,
          }),
        ]}
      >
        <SeoHeading level={2} style={[styles.referenceTitle, { color: theme.colors.textSecondary }]}>
          {title}
        </SeoHeading>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{
            color: theme.colors.accentText,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          {open ? '\u2212' : '+'}
        </Text>
      </Pressable>
      {open ? <View style={styles.referenceBody}>{children}</View> : null}
    </View>
  );
}

export function SeoParagraph({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.body,
        lineHeight: 26,
      }}
    >
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* 单位切换 / 角度选择                                                 */
/* ------------------------------------------------------------------ */

const UNIT_OPTIONS = [
  { key: 'fractional', labelKey: 'common.unit.fractional' },
  { key: 'decimal', labelKey: 'common.unit.decimal' },
  { key: 'metric', labelKey: 'common.unit.metric' },
] as const;

export function SeoUnitToggle({
  value,
  onChange,
  toolName,
}: {
  value: 'fractional' | 'decimal' | 'metric';
  onChange: (unit: 'fractional' | 'decimal' | 'metric') => void;
  toolName: SeoToolName;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <View
      style={[
        styles.segment,
        {
          backgroundColor: theme.scheme === 'dark' ? theme.colors.background : '#EAF0F6',
          borderColor: theme.colors.border,
          borderRadius: theme.radius,
        },
      ]}
    >
      {UNIT_OPTIONS.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (option.key !== value) {
                trackSeoToolUnitChange(toolName, value, option.key);
              }
              onChange(option.key);
            }}
            style={(state) => [
              styles.segmentItem,
              selected
                ? {
                    backgroundColor: theme.scheme === 'dark' ? theme.colors.primary : '#FFFFFF',
                    borderColor: theme.scheme === 'dark' ? theme.colors.accent : '#C8D4E0',
                  }
                : {
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                  },
              webFocusHoverStyle(state, theme, {
                darkSurface: selected && theme.scheme === 'dark',
              }),
            ]}
          >
            <Text
              style={{
                color: selected
                  ? theme.colors.textPrimary
                  : theme.colors.textSecondary,
                fontSize: 13,
                fontWeight: selected
                  ? theme.fontWeight.semibold
                  : theme.fontWeight.medium,
              }}
            >
              {t(option.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// v2: preset 接口 —— 每个计算器把自己的「常见场景」配置传进来。
// 当前只放角度 / 管径快捷项；以后加整场景一键套用（如「4" offset @ 30°」）
// 只需往 presets 数组里加一条，屏幕无需改动。
export interface SeoQuickPreset {
  id: string;
  /** 主标签，如 `30°` 或 `1/2"`。 */
  label: string;
  /** 次要说明，如 `× 2.0` 或 `5" take-up`。 */
  hint?: string;
}

/** 大号快捷预设行：一点即填，不用下拉；最小高度 64pt（T62 硬指标）。 */
export function SeoPresetRow({
  presets,
  activeId,
  onSelect,
  toolName,
}: {
  presets: readonly SeoQuickPreset[];
  activeId: string;
  onSelect: (preset: SeoQuickPreset) => void;
  toolName: SeoToolName;
}) {
  const theme = useTheme();
  return (
    <View style={styles.presetRow}>
      {presets.map((preset) => {
        const selected = preset.id === activeId;
        return (
          <Pressable
            key={preset.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={
              preset.hint ? `${preset.label}, ${preset.hint}` : preset.label
            }
            onPress={() => {
              trackSeoToolPreset(toolName, preset.id);
              onSelect(preset);
            }}
            style={[
              styles.presetButton,
              {
                backgroundColor: selected
                  ? theme.colors.controlAccent
                  : theme.colors.background,
                borderColor: selected
                  ? theme.colors.accentText
                  : theme.colors.border,
                borderRadius: theme.radius,
              },
            ]}
          >
            <Text
              style={{
                color: selected
                  ? theme.colors.onControlAccent
                  : theme.colors.textPrimary,
                fontSize: theme.fontSize.title,
                fontWeight: theme.fontWeight.semibold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {preset.label}
            </Text>
            {preset.hint ? (
              <Text
                style={{
                  color: selected
                    ? theme.colors.onControlAccent
                    : theme.colors.textSecondary,
                  fontSize: theme.fontSize.secondary,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {preset.hint}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** 默认角度预设：30°/45° 是最常用的两个，multiplier 从 constants 派生不硬编。 */
export const DEFAULT_ANGLE_PRESETS: readonly SeoQuickPreset[] = (
  [30, 45] as OffsetAngle[]
).map((angle) => ({
  id: String(angle),
  label: `${angle}°`,
  hint: `× ${OFFSET_CONSTANTS[angle].multiplier}`,
}));

/**
 * 角度选择：全部 6 个标准角度固定 3 列网格，30°/45° 是更大的预设按钮（带 multiplier 提示），
 * 一点即填，无需下拉（T62 交互项 1）。390pt 与桌面窄列（横屏 600pt 分栏）都换行、不横向溢出。
 */
export function AngleSelector({
  value,
  onChange,
  presets: _presets = DEFAULT_ANGLE_PRESETS,
  toolName,
}: {
  value: OffsetAngle;
  onChange: (angle: OffsetAngle) => void;
  presets?: readonly SeoQuickPreset[];
  toolName: SeoToolName;
}) {
  const theme = useTheme();
  return (
    <View style={styles.angleRow}>
      {OFFSET_ANGLES.map((angle) => {
        const selected = angle === value;
        const multiplier = `× ${OFFSET_CONSTANTS[angle].multiplier.toFixed(1)}`;
        return (
          <Pressable
            key={angle}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${angle}°, ${multiplier}`}
            onPress={() => {
              trackSeoToolPreset(toolName, String(angle));
              onChange(angle);
            }}
            style={(state) => [
              styles.angleButton,
              {
                backgroundColor: selected
                  ? theme.scheme === 'dark'
                    ? theme.colors.controlAccent
                    : '#FFFBEB'
                  : theme.colors.card,
                borderColor: selected
                  ? theme.scheme === 'dark'
                    ? theme.colors.accent
                    : theme.colors.primary
                  : theme.colors.border,
                borderWidth: selected ? 1.5 : 1,
                borderRadius: theme.radius,
              },
              webFocusHoverStyle(state, theme, {
                hoverBorder: selected
                  ? theme.scheme === 'dark'
                    ? theme.colors.accent
                    : theme.colors.primary
                  : theme.colors.textSecondary,
              }),
            ]}
          >
            <Text
              style={{
                color: selected && theme.scheme === 'dark'
                  ? theme.colors.onControlAccent
                  : theme.colors.textPrimary,
                fontSize: 16,
                fontWeight: theme.fontWeight.semibold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {angle}°
            </Text>
            <Text
              style={{
                color: selected
                  ? theme.scheme === 'dark'
                    ? theme.colors.onControlAccent
                    : theme.colors.accentText
                  : theme.colors.textSecondary,
                fontSize: 11,
                fontVariant: ['tabular-nums'],
              }}
            >
              {multiplier}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 结果卡 / 表格 / FAQ / 内链                                          */
/* ------------------------------------------------------------------ */

export function SeoResultRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.resultRow,
        { borderTopColor: 'rgba(255,255,255,0.16)' },
      ]}
    >
      <Text
        style={{
          color: theme.colors.resultLabel,
          fontSize: theme.fontSize.secondary,
          flexShrink: 1,
          marginRight: theme.spacing.sm,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.resultText,
          fontSize: emphasis ? theme.fontSize.title : theme.fontSize.body,
          fontWeight: theme.fontWeight.semibold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function SeoResultCard({
  headline,
  headlineValue,
  rows,
  diagram,
}: {
  headline: string;
  headlineValue?: string;
  rows: readonly { label: string; value: string }[];
  /** v2 示意区：由调用方传入示意图插槽，缺省渲染空插槽。 */
  diagram?: ReactNode;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const isEmpty = headlineValue === undefined || headlineValue === '';
  return (
    <View
      style={[
        styles.resultCard,
        { backgroundColor: theme.colors.resultBackground, borderRadius: theme.radius },
      ]}
    >
      <Text
        style={{
          color: theme.colors.resultLabel,
          fontSize: theme.fontSize.secondary,
        }}
      >
        {headline}
      </Text>
      <Text
        style={{
          color: theme.colors.resultText,
          fontSize: theme.fontSize.result,
          fontWeight: theme.fontWeight.semibold,
          fontVariant: ['tabular-nums'],
          marginTop: 2,
        }}
      >
        {isEmpty ? '—' : headlineValue}
      </Text>
      {isEmpty ? (
        <Text
          style={{
            color: '#94A3B8',
            fontSize: 13,
            marginTop: 2,
          }}
        >
          {t('common.enterMeasurement')}
        </Text>
      ) : null}
      {rows.map((row) => (
        <SeoResultRow key={row.label} label={row.label} value={row.value} />
      ))}
      {/* v2: 示意图插槽 —— 以后在此挂 SVG 标注 mark 位置。 */}
      {diagram ?? <SeoDiagramSlot />}
    </View>
  );
}

// v2: 示意图插槽 —— 空 div + 注释；加图时把 SVG 传进 SeoResultCard 的 diagram 即可。
export function SeoDiagramSlot() {
  return (
    <View
      style={styles.diagramSlot}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/**
 * 一键复制：把结果拼成一句自然文本（copyResult.ts）复制到剪贴板，
 * 复制成功在按钮下方显示 2 秒 toast（aria-live polite，屏幕阅读器可读）。
 */
export function SeoCopyButton({
  text,
  disabled,
  toolName,
}: {
  text: string;
  disabled?: boolean;
  toolName: SeoToolName;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const handlePress = useCallback(async () => {
    const ok = await copyToClipboard(text, { source: 'seo_tool', toolName });
    trackSeoToolCopy(toolName, ok);
    if (ok) {
      logAmplitudeEvent('result_copied', { calculator: toolName });
    }
    setStatus(ok ? 'copied' : 'failed');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setStatus('idle'), 2000);
  }, [text, toolName]);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={handlePress}
        style={(state) => [
          styles.secondaryButton,
          {
            backgroundColor: theme.colors.card,
            borderColor: disabled ? theme.colors.border : theme.colors.primaryText,
            borderWidth: disabled ? 1 : 1.5,
            borderRadius: theme.radius,
            opacity: disabled ? 0.45 : state.pressed ? 0.85 : 1,
          },
          !disabled
            ? webFocusHoverStyle(state, theme, {
                hoverBg: theme.scheme === 'dark' ? theme.colors.card : '#FAFBFD',
              })
            : null,
        ]}
      >
        <CopyIcon size={16} color={theme.colors.textPrimary} />
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          {t('common.copy')}
        </Text>
      </Pressable>
      {status !== 'idle' ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            color:
              status === 'copied'
                ? theme.scheme === 'dark'
                  ? theme.colors.success
                  : '#15803D'
                : theme.colors.error,
            fontSize: theme.fontSize.secondary,
          }}
        >
          {status === 'copied' ? t('common.copied') : t('common.copyFailed')}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * 次级保存按钮：实时预览已承担即时计算，降级为轻量描边按钮用于写入历史与统计。
 */
export function SeoCalculateButton({
  onPress,
  label,
}: {
  onPress: () => void;
  label?: string;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={(state) => [
        styles.calculateButton,
        {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
          borderRadius: theme.radius,
          opacity: state.pressed ? 0.85 : 1,
        },
        webFocusHoverStyle(state, theme, {
          hoverBorder: theme.colors.primaryText,
          hoverBg: theme.scheme === 'dark' ? theme.colors.card : '#EFF4F8',
        }),
      ]}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.fontSize.secondary,
          fontWeight: theme.fontWeight.semibold,
        }}
      >
        {label ?? t('common.saveToHistory')}
      </Text>
    </Pressable>
  );
}

/**
 * 最近计算历史：一点回填全部输入。条目最小高度 48pt（戴手套可点）。
 * 无历史时不渲染（不占首屏）。
 */
export function SeoHistoryList({
  entries,
  loaded,
  onRefill,
  onClear,
  toolName,
}: {
  entries: readonly SeoHistoryEntry[];
  loaded: boolean;
  onRefill: (entry: SeoHistoryEntry) => void;
  onClear: () => void;
  toolName: SeoToolName;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  if (!loaded || entries.length === 0) {
    return null;
  }
  return (
    <SeoSection title={t('common.recentCalculations')}>
      <View style={{ gap: theme.spacing.xs }}>
        {entries.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel={t('common.refillLabel', {
              input: entry.inputSummary,
              summary: entry.summary,
            })}
            onPress={() => {
              trackSeoToolHistoryRefill(toolName);
              onRefill(entry);
            }}
            style={(state) => [
              styles.historyRow,
              {
                backgroundColor: state.pressed
                  ? theme.colors.background
                  : theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius,
              },
              webFocusHoverStyle(state, theme, {
                hoverBorder: theme.colors.textSecondary,
              }),
            ]}
          >
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.body,
                fontWeight: theme.fontWeight.semibold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {entry.inputSummary}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.secondary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {entry.summary}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={onClear}
          style={(state) => [
            styles.historyClear,
            webFocusHoverStyle(state, theme, {
              hoverBg: theme.colors.card,
            }),
          ]}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
              fontWeight: theme.fontWeight.medium,
            }}
          >
            {t('common.clearHistory')}
          </Text>
        </Pressable>
      </View>
    </SeoSection>
  );
}

/**
 * 计算器黄金路径布局：
 * - 竖屏：输入卡 → 计算按钮 → 结果卡，单列紧凑排列，390px 首屏一屏可见；
 * - 横屏（宽 ≥ 600 且宽 > 高）：输入与结果左右分栏，避免挤成一团。
 */
export function SeoCalcLayout({
  input,
  result,
}: {
  input: ReactNode;
  result: ReactNode;
}) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const wideDesktop = Platform.OS === 'web' && isWideDesktopViewport(width);
  const landscape = wideDesktop || (width > height && width >= 600);
  if (!landscape) {
    return (
      <>
        {input}
        {result}
      </>
    );
  }
  return (
    <View
      style={[
        styles.calcRow,
        { gap: wideDesktop ? theme.spacing.lg : theme.spacing.md },
      ]}
    >
      <View style={{ flex: wideDesktop ? 11 : 1, gap: theme.spacing.sm }}>
        {input}
      </View>
      <View style={{ flex: wideDesktop ? 9 : 1 }}>{result}</View>
    </View>
  );
}

/** 3 秒引导：一句操作提示，降低首次打开的理解成本。 */
export function SeoHint({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
      }}
    >
      {children}
    </Text>
  );
}

export function SeoDataTable({
  columns,
  rows,
}: {
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  const theme = useTheme();
  return (
    <View style={[styles.table, { borderColor: theme.colors.border }]}>
      <View
        style={[
          styles.tableRow,
          { backgroundColor: theme.colors.card },
        ]}
      >
        {columns.map((column, index) => (
          <Text
            key={column}
            style={[
              styles.tableCell,
              styles.tableHeader,
              {
                color: theme.colors.textPrimary,
                borderLeftColor: theme.colors.border,
                borderLeftWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            {column}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={row.join('|')}
          style={[
            styles.tableRow,
            {
              backgroundColor:
                rowIndex % 2 === 0 ? theme.colors.background : theme.colors.card,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          {row.map((cell, cellIndex) => (
            <Text
              key={`${rowIndex}-${cellIndex}`}
              style={[
                styles.tableCell,
                {
                  color: theme.colors.textPrimary,
                  fontVariant: ['tabular-nums'],
                  borderLeftColor: theme.colors.border,
                  borderLeftWidth:
                    cellIndex === 0 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/** 标准角度 multiplier / shrink 对照表（数据来自 constants.ts）。 */
export function OffsetMultiplierTable() {
  const { t } = useI18n();
  return (
    <SeoDataTable
      columns={[
        t('table.angle'),
        t('table.multiplier'),
        t('table.shrinkPerInch'),
      ]}
      rows={OFFSET_ANGLES.map((angle) => [
        `${angle}°`,
        String(OFFSET_CONSTANTS[angle].multiplier),
        formatShrinkPerInch(angle),
      ])}
    />
  );
}

function formatShrinkPerInch(angle: OffsetAngle): string {
  const perInch = OFFSET_CONSTANTS[angle].shrinkPerInch;
  const sixteenths = Math.round(perInch * 16);
  if (sixteenths % 16 === 0) {
    return `${sixteenths / 16}"`;
  }
  return `${sixteenths}/16"`;
}

export function TakeUpTable() {
  const { t } = useI18n();
  return (
    <SeoDataTable
      columns={[t('table.conduitSize'), t('table.takeUp')]}
      rows={TAKE_UP_OPTIONS.map((option) => [
        option.label,
        `${option.takeUpInches}"`,
      ])}
    />
  );
}

export function FaqSection({
  page,
  toolName,
}: {
  page: { faqs: readonly { question: string; answer: string }[] };
  toolName: SeoToolName;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [openQuestions, setOpenQuestions] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const toggle = (question: string) => {
    setOpenQuestions((previous) => {
      const next = new Set(previous);
      if (next.has(question)) {
        next.delete(question);
      } else {
        next.add(question);
        trackSeoToolFaqExpand(toolName, question);
      }
      return next;
    });
  };

  return (
    <View
      style={[
        styles.referenceSection,
        styles.readingMeasure,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius,
          paddingBottom: theme.spacing.sm,
        },
      ]}
    >
      <View style={styles.referenceHeader}>
        <SeoHeading
          level={2}
          style={[styles.referenceTitle, { color: theme.colors.textSecondary }]}
        >
          {t('common.faq')}
        </SeoHeading>
      </View>
      <View style={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.sm }}>
        {page.faqs.map((faq) => {
          const open = openQuestions.has(faq.question);
          return (
            <View key={faq.question} style={{ gap: 2 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => toggle(faq.question)}
                style={(state) => [
                  styles.faqQuestion,
                  webFocusHoverStyle(state, theme, {
                    hoverBg: theme.colors.background,
                  }),
                ]}
              >
                <SeoHeading
                  level={3}
                  style={[styles.faqQuestionText, { color: theme.colors.textSecondary }]}
                >
                  {faq.question}
                </SeoHeading>
                <Text
                  accessibilityElementsHidden
                  style={{
                    color: theme.colors.accentText,
                    fontSize: theme.fontSize.body,
                    fontWeight: theme.fontWeight.semibold,
                  }}
                >
                  {open ? '\u2212' : '+'}
                </Text>
              </Pressable>
              {open ? (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: theme.fontSize.secondary,
                    lineHeight: 20,
                  }}
                >
                  {faq.answer}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * SEO 内链：Web 端渲染真实 <a href>（可抓取），Native 端走导航。
 */
export function SeoLink({
  path,
  screen,
  children,
  trackFrom,
  trackTo,
}: {
  path: string;
  screen: SeoScreenName | 'RootTabs';
  children: ReactNode;
  /** internal_link_click 的 from 参数（当前工具页 tool_name）。 */
  trackFrom?: string;
  /** internal_link_click 的 to 参数（目标工具页 key / 'home'）。 */
  trackTo?: string;
}) {
  const theme = useTheme();
  const { lang } = useI18n();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const linkStyle: StyleProp<TextStyle> = {
    color: theme.colors.primaryText,
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.semibold,
    textDecorationLine: 'underline',
  };

  const handlePress = () => {
    if (trackFrom !== undefined && trackTo !== undefined) {
      trackInternalLinkClick(trackFrom, trackTo);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <AnchorText
        href={buildCalculatorNavHref(path, lang)}
        style={linkStyle}
        onPress={(event: unknown) => {
          const e = event as {
            preventDefault?: () => void;
            metaKey?: boolean;
            ctrlKey?: boolean;
            shiftKey?: boolean;
            altKey?: boolean;
          } | null;
          handlePress();
          if (e && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault?.();
            navigation.navigate(screen);
          }
        }}
      >
        {children}
      </AnchorText>
    );
  }

  return (
    <Text
      accessibilityRole="link"
      onPress={() => {
        handlePress();
        navigation.navigate(screen);
      }}
      style={linkStyle}
    >
      {children}
    </Text>
  );
}

/**
 * 底部内链网（L2 SEO 内容，位于计算器与 FAQ 之后）：
 * 其余 3 个工具页（各带一句 tagline 说明）+ 回首页 `/` 链接。
 * 链接数据与静态 shell 同源（src/seo/toolPages.ts 的 buildRelatedLinks），
 * 默认折叠之外、永远在计算器下方，不影响首屏 390×844 预算。
 */
export function RelatedCalculators({
  current,
  toolName,
}: {
  current: SeoToolPageMeta;
  toolName: SeoToolName;
}) {
  const theme = useTheme();
  const { lang } = useI18n();
  const links = buildRelatedLinks(current, lang);
  return (
    <SeoSection title={getRelatedCalculatorsTitle(lang)} style={styles.readingMeasure}>
      <View style={{ gap: theme.spacing.md }}>
        {links.map((link) => (
          <View key={link.key} style={{ gap: 2 }}>
            <SeoLink
              path={link.path}
              screen={
                link.key === 'home' ? 'RootTabs' : SEO_TOOL_SCREENS[link.key]
              }
              trackFrom={toolName}
              trackTo={link.key}
            >
              {link.title}
            </SeoLink>
            {link.description ? (
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.secondary,
                  lineHeight: 20,
                }}
              >
                {link.description}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </SeoSection>
  );
}

/**
 * SEO 工具页 Amplitude 计算完成上报（1000ms 防抖 + 卸载 flush + 签名去重，零 PII）。
 * 同步触发首次激活事件 activation_completed。
 */
export function useSeoAmplitudeCalculation(params: {
  calculator: CalculatorSlug;
  toolName: SeoToolName;
  pageSlug: string;
  signature: string | null;
  unitMode: UnitSystem;
}): void {
  const { calculator, toolName, pageSlug, signature, unitMode } = params;
  const unitSystem = unitMode === 'metric' ? 'metric' : 'imperial';
  useDebouncedCalculationCompleted(
    calculator,
    signature,
    unitSystem,
    (bendType, opts) => {
      logAmplitudeEvent('calculation_completed', {
        calculator: bendType,
        tool_name: toolName,
        unit_system: opts.unitSystem,
        unit_mode: opts.unitMode ?? unitMode,
        page_slug: pageSlug,
      });
      trackAmplitudeActivationIfNeeded({
        calculator: bendType,
        tool_name: toolName,
        page_slug: pageSlug,
      });
    },
    unitMode,
  );
}

/**
 * Value-First Android App 下载卡：置于计算工作区/历史下方，绝不遮挡或限制免费计算结果。
 * 突出 3 项真实工地优势（断网离线、本地历史、自定义弯管器鞋模校准），并携带标准 UTM 归因链接。
 */
export function SeoAppCtaCard({
  toolSlug,
  toolName,
}: {
  toolSlug: string;
  toolName: SeoToolName;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const playUrl = buildGooglePlayUrl({
    source: 'web_seo',
    medium: 'tool_cta',
    campaign: toolSlug,
    content: 'below_result',
  });

  const handlePress = useCallback(() => {
    trackEvent('google_play_click', {
      source: 'seo_tool_cta',
      tool_name: toolName,
    });
    logAmplitudeEvent('google_play_cta_clicked', {
      source: 'seo_tool_cta',
      page_slug: toolSlug,
      utm_source: 'web_seo',
      utm_medium: 'tool_cta',
      utm_campaign: toolSlug,
      cta_placement: 'below_result',
    });
  }, [toolName, toolSlug]);

  const bullets = [t('appCta.bullet1'), t('appCta.bullet2'), t('appCta.bullet3')];

  return (
    <View
      style={[
        styles.appCtaCard,
        styles.readingMeasure,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        },
      ]}
    >
      <Text
        style={{
          color: theme.colors.accentText,
          fontSize: 12,
          fontWeight: theme.fontWeight.semibold,
          letterSpacing: 0.4,
        }}
      >
        {t('appCta.eyebrow')}
      </Text>
      <SeoHeading level={2} style={{ fontSize: 18 }}>
        {t('appCta.title')}
      </SeoHeading>
      <View style={{ gap: 6 }}>
        {bullets.map((line) => (
          <View key={line} style={styles.appCtaBulletRow}>
            <Text
              style={{
                color: theme.colors.accentText,
                fontSize: theme.fontSize.secondary,
                fontWeight: theme.fontWeight.semibold,
              }}
            >
              •
            </Text>
            <Text
              style={{
                flex: 1,
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.secondary,
                lineHeight: 20,
              }}
            >
              {line}
            </Text>
          </View>
        ))}
      </View>
      {Platform.OS === 'web' ? (
        <AnchorText
          accessibilityRole="link"
          href={playUrl}
          hrefAttrs={{ target: '_blank', rel: 'noopener noreferrer' }}
          onPress={handlePress}
          style={
            [
              styles.appCtaButton,
              styles.appCtaButtonText,
              {
                backgroundColor: theme.colors.accent,
                color: theme.colors.onAccent,
                borderRadius: theme.radius,
              },
            ] as StyleProp<TextStyle>
          }
        >
          {t('appCta.button')}
        </AnchorText>
      ) : (
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            handlePress();
            void Linking.openURL(playUrl).catch(() => undefined);
          }}
          style={(state) => [
            styles.appCtaButton,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius,
              opacity: state.pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.appCtaButtonText,
              { color: theme.colors.onAccent },
            ]}
          >
            {t('appCta.button')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** 把英寸数按当前单位系统格式化为单字符串。 */
export function formatSeoLength(inches: number, unit: 'fractional' | 'decimal' | 'metric'): string {
  return formatLength(inches, unit);
}

const styles = StyleSheet.create({
  pageRoot: {
    flex: 1,
  },
  topHeaderBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  topHeaderInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerMenuButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subNavBar: {
    width: '100%',
    minHeight: 40,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 3,
    height: 38,
    alignSelf: 'flex-start',
  },
  segmentItem: {
    height: '100%',
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  angleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  angleButton: {
    height: 56,
    minHeight: 56,
    minWidth: 48,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '28%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  presetRow: {
    flexDirection: 'row',
    // 3 个 size 预设旧版 flexBasis 40% 合计 120% 且 flexShrink 0，必然溢出；
    // 改为换行 + 30% 网格，单行放 3 个，窄列自动退化为每行 2 个。
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    minHeight: 64,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  calculateButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  secondaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  historyRow: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  historyClear: {
    minHeight: 48,
    justifyContent: 'center',
  },
  diagramSlot: {
    width: '100%',
    height: 0,
  },
  resultCard: {
    width: '100%',
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 12,
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  tableHeader: {
    fontWeight: '600',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  switcherWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 4,
  },
  switcherChip: {
    minHeight: 38,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  switcherLink: {
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex' as unknown as TextStyle['display'],
  },
  readingMeasure: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  switcherUnderline: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 0,
    height: 2,
  },
  workspace: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  referenceSection: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  referenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  referenceTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  referenceBody: {
    gap: 16,
    paddingHorizontal: 10,
    paddingBottom: 16,
  },
  appCtaCard: {
    borderWidth: 1,
  },
  appCtaBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  appCtaButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
    display: 'flex' as unknown as TextStyle['display'],
    textAlign: 'center',
  },
  appCtaButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
