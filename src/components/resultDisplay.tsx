import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme';

interface ResultDisplayProps {
  label: string;
  value?: string;
  unit?: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

export default function ResultDisplay({
  label,
  value,
  unit,
  hint,
  style,
}: ResultDisplayProps) {
  const theme = useTheme();
  const isEmpty = value === undefined || value === '';

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
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text
          style={{
            color: theme.colors.resultText,
            fontSize: 34,
            fontWeight: theme.fontWeight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {isEmpty ? '—' : value}
        </Text>
        {!isEmpty && unit ? (
          <Text
            style={{
              color: theme.colors.accent,
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.semibold,
              marginLeft: theme.spacing.xs,
            }}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      {isEmpty && hint ? (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 4,
  },
});
