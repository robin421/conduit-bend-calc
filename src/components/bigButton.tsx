import { Platform, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { useTheme } from '../theme';

export type BigButtonVariant = 'primary' | 'accent' | 'secondary' | 'option';
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
        : resolvedVariant === 'option'
          ? theme.colors.textPrimary
          : theme.colors.primary;

  const showHairline =
    resolvedVariant === 'secondary' || resolvedVariant === 'option';

  const height =
    size === 'selection' ? theme.size.selectionButtonHeight : theme.size.buttonMinHeight;

  const rippleColor =
    resolvedVariant === 'primary'
      ? 'rgba(255, 255, 255, 0.16)'
      : resolvedVariant === 'accent'
        ? 'rgba(0, 0, 0, 0.16)'
        : theme.scheme === 'dark'
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(0, 0, 0, 0.08)';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderRadius: theme.radius,
          minHeight: height,
          borderWidth: showHairline ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.4 : pressed && Platform.OS !== 'android' ? 0.85 : 1,
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
          letterSpacing: 0.2,
          includeFontPadding: false,
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
    overflow: 'hidden',
  },
});
