import { StyleSheet, Text, View } from 'react-native';

import type { FeasibilityResult } from '../calculators/feasibility/feasibility';
import { useTheme } from '../theme';
import { formatMeasurement, type UnitSystem } from '../lib/units';
import BigButton from './bigButton';
import Card from './card';

interface FeasibilityPanelProps {
  result: FeasibilityResult | null;
  /** Pro 解锁完整三态面板；Free 仅一行风险 hint + CTA。 */
  isPro: boolean;
  unit: UnitSystem;
  onCheckFeasibility: () => void;
}

const STATUS_ICON: Record<FeasibilityResult['status'], string> = {
  feasible: '✓',
  tight: '⚠',
  impossible: '✕',
};

const STATUS_LABEL: Record<FeasibilityResult['status'], string> = {
  feasible: 'Bend feasible',
  tight: 'Tight bend',
  impossible: 'Bend not possible',
};

/**
 * P0-5 可行性面板。
 * Pro：完整三态（✓/⚠/✕）+ 剩余直段 + 替代方案 + 最小管长。
 * Free：仅在非 feasible 时显示一行风险 hint + [Check Bend Feasibility]。
 */
export default function FeasibilityPanel({
  result,
  isPro,
  unit,
  onCheckFeasibility,
}: FeasibilityPanelProps) {
  const theme = useTheme();

  if (!result) {
    return null;
  }

  const color =
    result.status === 'feasible'
      ? theme.colors.success
      : result.status === 'tight'
        ? theme.colors.accentText
        : theme.colors.error;

  if (!isPro) {
    if (result.status === 'feasible') {
      return null;
    }
    return (
      <View style={{ gap: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            lineHeight: 20,
          }}
        >
          {result.status === 'impossible'
            ? 'This bend may not be possible with standard geometry.'
            : 'This bend may be difficult with standard geometry.'}
        </Text>
        <BigButton
          title="Check Bend Feasibility"
          variant="secondary"
          onPress={onCheckFeasibility}
        />
      </View>
    );
  }

  const straightMeasurement =
    result.remainingStraightInches !== null
      ? formatMeasurement(result.remainingStraightInches, unit)
      : null;
  const minimumMeasurement =
    result.minimumConduitInches !== null
      ? formatMeasurement(result.minimumConduitInches, unit)
      : null;

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <View style={styles.header}>
        <Text style={[styles.icon, { color }]}>{STATUS_ICON[result.status]}</Text>
        <Text
          style={{
            color,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          {STATUS_LABEL[result.status]}
        </Text>
      </View>
      {result.messages.map((message, index) => (
        <Text
          key={`message-${index}`}
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.secondary,
            lineHeight: 20,
          }}
        >
          {message}
        </Text>
      ))}
      {straightMeasurement ? (
        <View style={styles.row}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
            Remaining straight
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {`${straightMeasurement.value} ${straightMeasurement.unit}`}
          </Text>
        </View>
      ) : null}
      {minimumMeasurement ? (
        <View style={styles.row}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
            Minimum conduit required
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {`${minimumMeasurement.value} ${minimumMeasurement.unit}`}
          </Text>
        </View>
      ) : null}
      {result.suggestions.map((suggestion, index) => (
        <Text
          key={`suggestion-${index}`}
          style={{
            color: theme.colors.accentText,
            fontSize: theme.fontSize.secondary,
            lineHeight: 20,
          }}
        >
          {suggestion}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 20,
    lineHeight: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
