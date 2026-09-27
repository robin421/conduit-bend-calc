import { StyleSheet, Text, View } from 'react-native';

import type { LayoutWarning } from '../calculators/geometry/geometry';
import { useTheme } from '../theme';

interface WarningBarProps {
  warnings: readonly LayoutWarning[];
}

const ICONS: Record<LayoutWarning['level'], string> = {
  error: '⛔',
  warning: '⚠️',
  info: 'ℹ️',
};

/**
 * 不可行弯 / min stub / NEC 预警条。
 * 无预警时不渲染；放在结果下方，不遮挡原结果。
 * 颜色全部取自主题色板（error 红、accent 金、textSecondary 灰），不引入新色值。
 */
export default function WarningBar({ warnings }: WarningBarProps) {
  const theme = useTheme();

  if (warnings.length === 0) {
    return null;
  }

  const severityColor = (level: LayoutWarning['level']): string => {
    switch (level) {
      case 'error':
        return theme.colors.error;
      case 'warning':
        return theme.colors.accent;
      case 'info':
        return theme.colors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { gap: theme.spacing.sm }]}>
      {warnings.map((warning, index) => {
        const color = severityColor(warning.level);
        return (
          <View
            key={`${warning.level}-${index}`}
            style={[
              styles.bar,
              {
                borderLeftColor: color,
                backgroundColor: `${color}1A`,
                borderRadius: theme.radius,
                padding: theme.spacing.sm,
              },
            ]}
            accessibilityRole="alert"
          >
            <Text style={[styles.icon, { color }]}>{ICONS[warning.level]}</Text>
            <Text
              style={[
                styles.message,
                {
                  color:
                    warning.level === 'warning'
                      ? theme.colors.textPrimary
                      : color,
                  fontSize: theme.fontSize.body,
                },
              ]}
            >
              {warning.message}
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
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    gap: 8,
  },
  icon: {
    fontSize: 18,
    lineHeight: 24,
  },
  message: {
    flex: 1,
    fontWeight: '600',
    lineHeight: 22,
  },
});
