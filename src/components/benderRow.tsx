import { Pressable, StyleSheet, Text } from 'react-native';

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Bender: ${displaySpecName(spec)}. Tap to change`}
      onPress={onPress}
      android_ripple={{ color: theme.colors.border }}
      style={styles.row}
    >
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
        }}
      >
        Bender
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.fontSize.secondary,
          marginLeft: theme.spacing.sm,
        }}
      >
        {displaySpecName(spec)} ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});
