import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { formatResultUnit } from './resultGroupFormat';

export interface ResultItem {
  label: string;
  value?: string;
  unit?: string;
}

interface ResultGroupProps {
  hero: ResultItem;
  rows?: readonly ResultItem[];
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

const DIVIDER_COLOR = 'rgba(255,255,255,0.16)';

/**
 * 单个炭黑结果容器：hero 主结果 + 若干次要行。
 * 数值格式由调用方负责，本组件只负责层级排版与主题色。
 */
export default function ResultGroup({ hero, rows = [], hint, style }: ResultGroupProps) {
  const theme = useTheme();
  const heroEmpty = hero.value === undefined || hero.value === '';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.resultBackground,
          borderRadius: theme.radius,
          padding: theme.spacing.md,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: theme.colors.resultLabel,
          fontSize: theme.fontSize.secondary,
        }}
      >
        {hero.label}
      </Text>
      <View style={styles.heroRow}>
        <Text
          style={{
            color: theme.colors.resultText,
            fontSize: theme.fontSize.result,
            fontWeight: theme.fontWeight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {heroEmpty ? '—' : hero.value}
        </Text>
        {!heroEmpty && hero.unit ? (
          <Text
            style={{
              color: theme.colors.accent,
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.semibold,
              marginLeft: theme.spacing.xs,
            }}
          >
            {hero.unit}
          </Text>
        ) : null}
      </View>
      {heroEmpty && hint ? (
        <Text
          style={{
            color: theme.colors.resultLabel,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.xs,
          }}
        >
          {hint}
        </Text>
      ) : null}

      {rows.map((row, index) => {
        const rowEmpty = row.value === undefined || row.value === '';
        return (
          <View
            key={`${row.label}-${index}`}
            style={[
              styles.row,
              {
                borderTopColor: DIVIDER_COLOR,
                marginTop: theme.spacing.md,
                paddingTop: theme.spacing.md,
              },
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
              {row.label}
            </Text>
            <Text
              style={{
                color: theme.colors.resultText,
                fontSize: theme.fontSize.title,
                fontWeight: theme.fontWeight.semibold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {rowEmpty ? '—' : row.value}
              {!rowEmpty && row.unit ? (
                <Text style={{ color: theme.colors.accent }}>
                  {formatResultUnit(row.unit)}
                </Text>
              ) : null}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
