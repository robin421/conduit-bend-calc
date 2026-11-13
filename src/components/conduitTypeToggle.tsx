import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        {OPTIONS.map((option, index) => {
          const selected = option === value;
          const rippleColor = theme.colors.pressFeedback;

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Conduit material ${OPTION_LABELS[option]}`}
              onPress={() => onChange(option)}
              android_ripple={{ color: rippleColor }}
              style={[
                styles.option,
                index > 0 && {
                  borderLeftWidth: 1,
                  borderLeftColor: theme.colors.border,
                },
                {
                  backgroundColor: selected
                    ? theme.colors.controlAccent
                    : theme.colors.card,
                },
              ]}
            >
              {({ pressed }) => (
                <>
                  {pressed && Platform.OS !== 'android' ? (
                    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.pressFeedback }]} />
                  ) : null}
                  <Text
                    style={{
                      color: selected
                        ? theme.colors.onControlAccent
                        : theme.colors.textPrimary,
                      fontSize: theme.fontSize.body,
                      fontWeight: theme.fontWeight.semibold,
                      letterSpacing: 0.2,
                      includeFontPadding: false,
                    }}
                  >
                    {OPTION_LABELS[option]}
                  </Text>
                </>
              )}
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
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
});
