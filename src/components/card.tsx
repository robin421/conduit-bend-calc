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
    const rippleColor = theme.colors.pressFeedback;

    return (
      <Pressable
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: rippleColor }}
        style={(state) => {
          const { pressed, hovered, focused } = state as {
            pressed: boolean;
            hovered?: boolean;
            focused?: boolean;
          };
          return [
            cardStyle,
            {
              opacity: disabled ? 0.4 : pressed && Platform.OS !== 'android' ? 0.96 : 1,
            },
            Platform.OS === 'web' && hovered && !disabled
              ? {
                  borderColor: theme.colors.primaryText,
                  backgroundColor: theme.scheme === 'dark' ? theme.colors.card : '#FAFBFD',
                }
              : null,
            Platform.OS === 'web' && focused
              ? ({
                  outlineStyle: 'solid',
                  outlineWidth: 2,
                  outlineColor: theme.colors.accentText,
                } as object)
              : null,
          ];
        }}
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
