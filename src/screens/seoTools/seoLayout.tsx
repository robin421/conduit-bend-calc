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
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { OFFSET_ANGLES, OFFSET_CONSTANTS, TAKE_UP_OPTIONS } from '../../constants';
import type { OffsetAngle } from '../../constants';
import type { RootStackParamList } from '../../navigation/rootStack';
import { SEO_TOOL_SCREENS, type SeoScreenName } from '../../navigation/seoRoutes';
import { SEO_TOOL_PAGES, type SeoToolPageMeta } from '../../seo/toolPages';
import {
  trackInternalLinkClick,
  trackSeoToolCopy,
  trackSeoToolFaqExpand,
  trackSeoToolHistoryRefill,
  trackSeoToolPreset,
  trackSeoToolUnitChange,
  type SeoToolName,
} from '../../lib/analytics';
import { copyToClipboard } from '../../lib/clipboard';
import type { SeoHistoryEntry } from '../../lib/seoHistory';
import { formatLength } from '../../lib/units';
import { useTheme } from '../../theme';

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
export function SeoPage({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.page,
        {
          paddingHorizontal: theme.spacing.sm,
          paddingTop: 12,
          paddingBottom: theme.spacing.lg,
          gap: 12,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
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
          padding: theme.spacing.sm,
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
    <View style={[{ gap: theme.spacing.sm }, style]}>
      <SeoHeading level={2}>{title}</SeoHeading>
      {children}
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
        lineHeight: 24,
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
  { key: 'fractional', label: 'Fraction' },
  { key: 'decimal', label: 'Decimal' },
  { key: 'metric', label: 'Metric' },
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
  return (
    <View style={[styles.segment, { borderColor: theme.colors.border }]}>
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
            style={[
              styles.segmentItem,
              {
                backgroundColor: selected
                  ? theme.colors.primary
                  : theme.colors.card,
              },
            ]}
          >
            <Text
              style={{
                color: selected
                  ? theme.colors.onPrimary
                  : theme.colors.textPrimary,
                fontSize: theme.fontSize.secondary,
                fontWeight: theme.fontWeight.semibold,
              }}
            >
              {option.label}
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
                  ? theme.colors.accent
                  : theme.colors.background,
                borderColor: selected
                  ? theme.colors.accent
                  : theme.colors.border,
                borderRadius: theme.radius,
              },
            ]}
          >
            <Text
              style={{
                color: selected
                  ? theme.colors.onAccent
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
                    ? theme.colors.onAccent
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
 * 角度选择：一行放下全部 6 个标准角度，30°/45° 是更大的预设按钮（带 multiplier 提示），
 * 一点即填，无需下拉（T62 交互项 1）。390px 宽度下单行不换行。
 */
export function AngleSelector({
  value,
  onChange,
  presets = DEFAULT_ANGLE_PRESETS,
  toolName,
}: {
  value: OffsetAngle;
  onChange: (angle: OffsetAngle) => void;
  presets?: readonly SeoQuickPreset[];
  toolName: SeoToolName;
}) {
  const theme = useTheme();
  const presetAngles = new Set(presets.map((preset) => Number(preset.id)));
  const remainingAngles = OFFSET_ANGLES.filter(
    (angle) => !presetAngles.has(angle),
  );
  return (
    <View style={styles.angleRow}>
      {presets.map((preset) => {
        const angle = Number(preset.id) as OffsetAngle;
        const selected = angle === value;
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
              onChange(angle);
            }}
            style={[
              styles.anglePresetButton,
              {
                backgroundColor: selected
                  ? theme.colors.accent
                  : theme.colors.background,
                borderColor: selected
                  ? theme.colors.accent
                  : theme.colors.border,
                borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
                borderRadius: theme.radius,
              },
            ]}
          >
            <Text
              style={{
                color: selected
                  ? theme.colors.onAccent
                  : theme.colors.textPrimary,
                fontSize: theme.fontSize.body,
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
                    ? theme.colors.onAccent
                    : theme.colors.textSecondary,
                  fontSize: 11,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {preset.hint}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
      {remainingAngles.map((angle) => {
        const selected = angle === value;
        return (
          <Pressable
            key={angle}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(angle)}
            style={[
              styles.angleButton,
              {
                backgroundColor: selected
                  ? theme.colors.accent
                  : theme.colors.background,
                borderColor: selected
                  ? theme.colors.accent
                  : theme.colors.border,
                borderRadius: theme.radius,
              },
            ]}
          >
            <Text
              style={{
                color: selected
                  ? theme.colors.onAccent
                  : theme.colors.textPrimary,
                fontSize: theme.fontSize.secondary,
                fontWeight: theme.fontWeight.semibold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {angle}°
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
          fontSize: 32,
          fontWeight: theme.fontWeight.semibold,
          fontVariant: ['tabular-nums'],
          marginTop: 2,
        }}
      >
        {headlineValue === undefined || headlineValue === '' ? '—' : headlineValue}
      </Text>
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
    const ok = await copyToClipboard(text);
    trackSeoToolCopy(toolName, ok);
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
        style={({ pressed }) => [
          styles.secondaryButton,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: theme.radius,
            opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          Copy result
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
          {status === 'copied' ? 'Copied to clipboard' : 'Copy failed'}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * 主「计算」按钮：大号电工橙，写死 56pt 高，戴手套也好按。
 * 它的存在让“输入 → 计算 → 结果”成为一条明确黄金路径，
 * 也避免边打字边弹结果、混淆“当前结果对应哪组输入”。
 */
export function SeoCalculateButton({
  onPress,
  label = 'Calculate',
}: {
  onPress: () => void;
  label?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.calculateButton,
        {
          backgroundColor: theme.colors.accent,
          borderRadius: theme.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: theme.colors.onAccent,
          fontSize: theme.fontSize.body,
          fontWeight: theme.fontWeight.semibold,
        }}
      >
        {label}
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
  if (!loaded || entries.length === 0) {
    return null;
  }
  return (
    <SeoSection title="Recent calculations">
      <View style={{ gap: theme.spacing.xs }}>
        {entries.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel={`Refill: ${entry.inputSummary}, ${entry.summary}`}
            onPress={() => {
              trackSeoToolHistoryRefill(toolName);
              onRefill(entry);
            }}
            style={({ pressed }) => [
              styles.historyRow,
              {
                backgroundColor: pressed
                  ? theme.colors.background
                  : theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius,
              },
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
          style={styles.historyClear}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
              textDecorationLine: 'underline',
            }}
          >
            Clear history
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
  const landscape = width > height && width >= 600;
  if (!landscape) {
    return (
    <>
      {input}
      {result}
    </>
    );
  }
  return (
    <View style={[styles.calcRow, { gap: theme.spacing.md }]}>
      <View style={{ flex: 1, gap: theme.spacing.sm }}>{input}</View>
      <View style={{ flex: 1 }}>{result}</View>
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
        fontSize: theme.fontSize.secondary,
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
  return (
    <SeoDataTable
      columns={['Angle', 'Multiplier', 'Shrink per inch']}
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
  return (
    <SeoDataTable
      columns={['Conduit size', 'Take-up']}
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
    <SeoSection title="Frequently asked questions">
      <View style={{ gap: theme.spacing.sm }}>
        {page.faqs.map((faq) => {
          const open = openQuestions.has(faq.question);
          return (
            <View key={faq.question} style={{ gap: 2 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => toggle(faq.question)}
                style={styles.faqQuestion}
              >
                <SeoHeading level={3} style={styles.faqQuestionText}>
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
                    color: theme.colors.textPrimary,
                    fontSize: theme.fontSize.body,
                    lineHeight: 24,
                  }}
                >
                  {faq.answer}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </SeoSection>
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
      <AnchorText href={path} style={linkStyle} onPress={handlePress}>
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

/** 底部内链网：其余 3 个工具页 + 首页。 */
export function MoreFreeTools({
  current,
  toolName,
}: {
  current: SeoToolPageMeta;
  toolName: SeoToolName;
}) {
  const theme = useTheme();
  const others = SEO_TOOL_PAGES.filter((page) => page.key !== current.key);
  return (
    <SeoSection title="More free tools">
      <View style={[{ gap: theme.spacing.xs }]}>
        {others.map((page) => (
          <SeoLink
            key={page.key}
            path={page.path}
            screen={SEO_TOOL_SCREENS[page.key]}
            trackFrom={toolName}
            trackTo={page.key}
          >
            {page.h1}
          </SeoLink>
        ))}
        <SeoLink path="/" screen="RootTabs" trackFrom={toolName} trackTo="home">
          All conduit bending calculators
        </SeoLink>
      </View>
    </SeoSection>
  );
}

/** 把英寸数按当前单位系统格式化为单字符串。 */
export function formatSeoLength(inches: number, unit: 'fractional' | 'decimal' | 'metric'): string {
  return formatLength(inches, unit);
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  segmentItem: {
    minHeight: 48,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  angleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  angleButton: {
    minHeight: 48,
    minWidth: 48,
    flexGrow: 1,
    flexBasis: '12%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  anglePresetButton: {
    minHeight: 64,
    minWidth: 52,
    flexGrow: 1,
    flexBasis: '16%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    minHeight: 64,
    flexGrow: 1,
    flexBasis: '40%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  calculateButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
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
    padding: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 8,
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
  },
});
