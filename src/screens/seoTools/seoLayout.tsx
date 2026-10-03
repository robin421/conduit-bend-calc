import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { ComponentProps, ComponentType, ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { OFFSET_ANGLES, OFFSET_CONSTANTS, TAKE_UP_OPTIONS } from '../../constants';
import type { OffsetAngle } from '../../constants';
import type { RootStackParamList } from '../../navigation/rootStack';
import { SEO_TOOL_SCREENS, type SeoScreenName } from '../../navigation/seoRoutes';
import { SEO_TOOL_PAGES, type SeoToolPageMeta } from '../../seo/toolPages';
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
        { padding: theme.spacing.md, gap: theme.spacing.md },
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
  const fontSize = level === 1 ? 26 : level === 2 ? 20 : 16;
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
}: {
  value: 'fractional' | 'decimal' | 'metric';
  onChange: (unit: 'fractional' | 'decimal' | 'metric') => void;
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
            onPress={() => onChange(option.key)}
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

export function AngleSelector({
  value,
  onChange,
}: {
  value: OffsetAngle;
  onChange: (angle: OffsetAngle) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.angleRow}>
      {OFFSET_ANGLES.map((angle) => {
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
                borderColor: theme.colors.border,
                borderRadius: theme.radius,
              },
            ]}
          >
            <Text
              style={{
                color: selected ? theme.colors.onAccent : theme.colors.textPrimary,
                fontSize: theme.fontSize.body,
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
}: {
  headline: string;
  headlineValue?: string;
  rows: readonly { label: string; value: string }[];
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
          fontSize: theme.fontSize.result,
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
    </View>
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
}: {
  page: { faqs: readonly { question: string; answer: string }[] };
}) {
  const theme = useTheme();
  return (
    <SeoSection title="Frequently asked questions">
      <View style={{ gap: theme.spacing.sm }}>
        {page.faqs.map((faq) => (
          <View key={faq.question} style={{ gap: 2 }}>
            <SeoHeading level={3}>{faq.question}</SeoHeading>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.body,
                lineHeight: 24,
              }}
            >
              {faq.answer}
            </Text>
          </View>
        ))}
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
}: {
  path: string;
  screen: SeoScreenName | 'RootTabs';
  children: ReactNode;
}) {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const linkStyle: StyleProp<TextStyle> = {
    color: theme.colors.primary,
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.semibold,
    textDecorationLine: 'underline',
  };

  if (Platform.OS === 'web') {
    return (
      <AnchorText href={path} style={linkStyle}>
        {children}
      </AnchorText>
    );
  }

  return (
    <Text
      accessibilityRole="link"
      onPress={() => navigation.navigate(screen)}
      style={linkStyle}
    >
      {children}
    </Text>
  );
}

/** 底部内链网：其余 3 个工具页 + 首页。 */
export function MoreFreeTools({ current }: { current: SeoToolPageMeta }) {
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
          >
            {page.h1}
          </SeoLink>
        ))}
        <SeoLink path="/" screen="RootTabs">
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
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  angleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  angleButton: {
    minHeight: 44,
    minWidth: 56,
    flexGrow: 1,
    flexBasis: '28%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
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
});
