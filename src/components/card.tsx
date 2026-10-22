import { ReactNode } from 'react';
import {
  AccessibilityRole,
  AccessibilityState,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '../theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  disabled?: boolean;
}

export default function Card({
  children,
  style,
  onPress,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
  disabled,
}: CardProps) {
  const theme = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      overflow: 'hidden' as const,
    },
    style,
  ];

  if (onPress) {
    const rippleColor =
      theme.scheme === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.06)';

    return (
      <Pressable
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: rippleColor }}
        style={({ pressed }) => [
          cardStyle,
          {
            opacity: disabled ? 0.4 : pressed && Platform.OS !== 'android' ? 0.88 : 1,
          },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={cardStyle}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
});
