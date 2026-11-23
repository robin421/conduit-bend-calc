import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import Card from '../components/card';
import RatingCard from '../components/ratingCard';
import FeedbackCard from '../components/feedbackCard';
import { OFFSET_ANGLES, OFFSET_CONSTANTS, TAKE_UP_OPTIONS } from '../constants';
import { useI18n } from '../i18n';
import { formatLength } from '../lib/units';
import { useUnitSystem } from '../lib/unitStore';
import { isWideDesktopViewport, workspaceMaxWidth } from '../seo/calculatorNav';
import { Theme, useTheme } from '../theme';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const rippleColor = theme.colors.pressFeedback;

  return (
    <Card style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          open
            ? t('lookup.sectionCollapseA11y', { title })
            : t('lookup.sectionExpandA11y', { title })
        }
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        android_ripple={{ color: rippleColor }}
        style={({ pressed }) => [
          styles.sectionHeader,
          {
            opacity: pressed && Platform.OS !== 'android' ? 0.96 : 1,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.chevron, { color: theme.colors.accentText }]}>
          {open ? '▾' : '▸'}
        </Text>
      </Pressable>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </Card>
  );
}

function TableHeader({ cols, theme }: { cols: string[]; theme: Theme }) {
  return (
    <View style={[styles.row, styles.headerRow, { borderBottomColor: theme.colors.border }]}>
      {cols.map((c) => (
        <Text
          key={c}
          style={[styles.cell, styles.headerCell, { color: theme.colors.textSecondary }]}
        >
          {c}
        </Text>
      ))}
    </View>
  );
}

function TableRow({
  cols,
  theme,
  last,
}: {
  cols: string[];
  theme: Theme;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !last && {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: Platform.OS === 'android' ? 1 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {cols.map((c, i) => (
        <Text
          key={i}
          style={[
            styles.cell,
            { color: theme.colors.textPrimary },
            i === 0 && { color: theme.colors.accentText, fontWeight: '700' },
          ]}
        >
          {c}
        </Text>
      ))}
    </View>
  );
}

function formatShrink(perInch: number): string {
  // shrinkPerInch 是无量纲比值（如 30° 为 1/4），以分数展示，不带单位符号，
  // 三种单位模式下数值相同。
  const sixteenths = Math.round(perInch * 16);
  if (sixteenths === 0) return '0';
  if (sixteenths === 16) return '1';
  const g = gcd(sixteenths, 16);
  return `${sixteenths / g}/${16 / g}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function LookupScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const { unit } = useUnitSystem();
  const isWideWeb = Platform.OS === 'web' && isWideDesktopViewport(width);
  const maxWidth = isWideWeb ? workspaceMaxWidth(width) : 720;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[
        styles.content,
        { maxWidth, padding: isWideWeb ? 24 : 16 },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('lookup.title')}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {t('lookup.subtitle')}
      </Text>

      <View style={isWideWeb ? styles.wideGrid : undefined}>
        <View style={isWideWeb ? styles.wideCell : undefined}>
          <Section title={t('lookup.offsetSection')}>
            <TableHeader
              cols={[t('table.angle'), t('table.multiplier'), t('lookup.shrinkPerInShort')]}
              theme={theme}
            />
            {OFFSET_ANGLES.map((angle, i) => {
              const c = OFFSET_CONSTANTS[angle];
              return (
                <TableRow
                  key={angle}
                  cols={[`${angle}°`, c.multiplier.toFixed(1), formatShrink(c.shrinkPerInch)]}
                  theme={theme}
                  last={i === OFFSET_ANGLES.length - 1}
                />
              );
            })}
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
              {t('lookup.offsetFormulaNote')}
            </Text>
          </Section>
        </View>

        <View style={isWideWeb ? styles.wideCell : undefined}>
          <Section title={t('lookup.stubSection')}>
            <TableHeader cols={[t('lookup.sizeCol'), t('table.takeUp')]} theme={theme} />
            {TAKE_UP_OPTIONS.map((opt, i) => (
              <TableRow
                key={opt.size}
                cols={[opt.label, formatLength(opt.takeUpInches, unit)]}
                theme={theme}
                last={i === TAKE_UP_OPTIONS.length - 1}
              />
            ))}
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
              {t('lookup.stubFormulaNote')}
            </Text>
          </Section>
        </View>

        <View style={isWideWeb ? styles.wideCell : undefined}>
          <Section title={t('lookup.saddleSection')}>
            <Text style={[styles.body, { color: theme.colors.textPrimary }]}>
              {t('lookup.saddleIntro')}
            </Text>
            <Text style={[styles.body, { color: theme.colors.textPrimary }]}>
              {t('lookup.saddle3Note')}
            </Text>
            <Text style={[styles.body, { color: theme.colors.textPrimary }]}>
              {t('lookup.saddle4Note')}
            </Text>
          </Section>
        </View>

        <View style={[isWideWeb ? styles.wideCell : undefined, { gap: theme.spacing.md }]}>
          <RatingCard source="reference" />
          <FeedbackCard />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, width: '100%', maxWidth: 720, alignSelf: 'center' },
  wideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  wideCell: { flexBasis: '48%', flexGrow: 1, minWidth: 320 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  section: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  chevron: { fontSize: 18, fontWeight: '700' },
  sectionBody: { marginTop: 8 },
  row: { flexDirection: 'row', paddingVertical: 12 },
  headerRow: { borderBottomWidth: 1.5, paddingBottom: 10 },
  cell: { flex: 1, fontSize: 16, fontVariant: ['tabular-nums'], includeFontPadding: false },
  headerCell: { fontSize: 13, fontWeight: '600' },
  note: { fontSize: 13, marginTop: 12, lineHeight: 20 },
  body: { fontSize: 15, lineHeight: 24 },
});
