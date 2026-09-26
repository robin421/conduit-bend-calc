import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Card from '../components/card';
import { OFFSET_ANGLES, OFFSET_CONSTANTS, TAKE_UP_OPTIONS } from '../constants';
import { Theme, useTheme } from '../theme';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  return (
    <Card style={styles.section}>
      <TouchableOpacity onPress={() => setOpen((v) => !v)} activeOpacity={0.7}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.chevron, { color: theme.colors.accent }]}>
            {open ? '▾' : '▸'}
          </Text>
        </View>
      </TouchableOpacity>
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
        !last && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      {cols.map((c, i) => (
        <Text
          key={i}
          style={[
            styles.cell,
            { color: theme.colors.textPrimary },
            i === 0 && { color: theme.colors.accent, fontWeight: '700' },
          ]}
        >
          {c}
        </Text>
      ))}
    </View>
  );
}

function formatShrink(perInch: number): string {
  // shrinkPerInch 以分数形式展示，如 1/4"/inch
  const sixteenths = Math.round(perInch * 16);
  if (sixteenths === 0) return '0';
  if (sixteenths === 16) return '1"';
  const g = gcd(sixteenths, 16);
  return `${sixteenths / g}/${16 / g}"`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function LookupScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>常数速查</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        数值与 PRD 第 10 节一致 · 全离线可用
      </Text>

      <Section title="Offset 角度常数">
        <TableHeader cols={['角度', '倍数', 'Shrink/英寸']} theme={theme} />
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
          间距 = 障碍高度 × 倍数；Shrink = 高度 × Shrink/英寸
        </Text>
      </Section>

      <Section title="90° Stub Take-up（EMT）">
        <TableHeader cols={['规格', 'Take-up']} theme={theme} />
        {TAKE_UP_OPTIONS.map((opt, i) => (
          <TableRow
            key={opt.size}
            cols={[opt.label, `${opt.takeUpInches}"`]}
            theme={theme}
            last={i === TAKE_UP_OPTIONS.length - 1}
          />
        ))}
        <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
          标记点 = 目标高度 − Take-up
        </Text>
      </Section>

      <Section title="Saddle 常数说明">
        <Text style={[styles.body, { color: theme.colors.textPrimary }]}>
          3 点 / 4 点 Saddle 复用上表角度倍数：
        </Text>
        <Text style={[styles.body, { color: theme.colors.textPrimary }]}>
          · 3 点：两侧弯曲点间距 = 高度 × 倍数
        </Text>
        <Text style={[styles.body, { color: theme.colors.textPrimary }]}>
          · 4 点：外侧标记 = 障碍半宽 + 高度 × 倍数
        </Text>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  section: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  chevron: { fontSize: 20, fontWeight: '700' },
  sectionBody: { marginTop: 8 },
  row: { flexDirection: 'row', paddingVertical: 10 },
  headerRow: { borderBottomWidth: 1 },
  cell: { flex: 1, fontSize: 16, fontVariant: ['tabular-nums'] },
  headerCell: { fontSize: 13, fontWeight: '600' },
  note: { fontSize: 13, marginTop: 10, lineHeight: 18 },
  body: { fontSize: 15, lineHeight: 24 },
});
