import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { useTheme } from '../theme';

export type BigButtonVariant = 'primary' | 'accent' | 'secondary';
export type BigButtonSize = 'default' | 'selection';

interface BigButtonProps {
  title: string;
  onPress?: () => void;
  variant?: BigButtonVariant;
  size?: BigButtonSize;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function BigButton({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  selected = false,
  disabled = false,
  style,
}: BigButtonProps) {
  const theme = useTheme();
  const resolvedVariant: BigButtonVariant = selected ? 'accent' : variant;

  const backgroundColor =
    resolvedVariant === 'primary'
      ? theme.colors.primary
      : resolvedVariant === 'accent'
        ? theme.colors.accent
        : theme.colors.card;

  const textColor =
    resolvedVariant === 'primary'
      ? theme.colors.onPrimary
      : resolvedVariant === 'accent'
        ? theme.colors.onAccent
        : theme.colors.primary;

  const height =
    size === 'selection' ? theme.size.selectionButtonHeight : theme.size.buttonMinHeight;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: theme.colors.border }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderRadius: theme.radius,
          minHeight: height,
          borderWidth: resolvedVariant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: textColor,
          fontSize: theme.fontSize.body,
          fontWeight: theme.fontWeight.semibold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
