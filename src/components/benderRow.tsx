import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { displaySpecName } from '../calculators/geometry/benderSpecs';
import type { BenderSpec } from '../constants';
import { useTheme } from '../theme';

interface BenderRowProps {
  spec: BenderSpec;
  onPress: () => void;
}

/** 计算器输入卡顶部的紧凑弯管机行：点击进入 Bender Setup。 */
export default function BenderRow({ spec, onPress }: BenderRowProps) {
  const theme = useTheme();
  const rippleColor =
    theme.scheme === 'dark'
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.06)';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Bender: ${displaySpecName(spec)}. Tap to change`}
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      style={({ pressed }) => [
        styles.row,
        {
          borderRadius: theme.radius,
          paddingHorizontal: theme.spacing.xs,
          opacity: pressed && Platform.OS !== 'android' ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
        }}
      >
        Bender
      </Text>
      <View style={styles.valueRow}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.secondary,
            fontWeight: theme.fontWeight.medium,
          }}
        >
          {displaySpecName(spec)}
        </Text>
        <Text
          style={{
            color: theme.colors.accentText,
            fontSize: theme.fontSize.secondary,
            marginLeft: 4,
          }}
        >
          ›
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginLeft: 8,
  },
});
