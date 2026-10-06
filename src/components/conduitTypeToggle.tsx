import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConduitType } from '../lib/profile';
import { useTheme } from '../theme';

const OPTIONS: readonly ConduitType[] = ['EMT', 'Rigid'];

/** 显示文案：Rigid 与 IMC 共用同一组弯管机规格（厂家文档），故合称。 */
const OPTION_LABELS: Record<ConduitType, string> = {
  EMT: 'EMT',
  Rigid: 'Rigid / IMC',
};

interface ConduitTypeToggleProps {
  value: ConduitType;
  onChange: (value: ConduitType) => void;
}

/**
 * 紧凑的两段式导体材质选择器（EMT | Rigid）。
 * 用于计算器屏幕输入卡顶部，约束下方的弯管机规格选择。
 */
export default function ConduitTypeToggle({
  value,
  onChange,
}: ConduitTypeToggleProps) {
  const theme = useTheme();
  return (
    <View>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
          marginBottom: theme.spacing.xs,
        }}
      >
        Conduit material
      </Text>
      <View
        style={[
          styles.row,
          {
            borderColor: theme.colors.border,
            borderRadius: theme.radius,
          },
        ]}
      >
        {OPTIONS.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Conduit material ${OPTION_LABELS[option]}`}
              onPress={() => onChange(option)}
              android_ripple={{ color: theme.colors.border }}
              style={[
                styles.option,
                {
                  backgroundColor: selected
                    ? theme.colors.accent
                    : theme.colors.card,
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
                }}
              >
                {OPTION_LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
