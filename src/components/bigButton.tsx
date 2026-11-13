import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

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
  expanded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function BigButton({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  selected = false,
  disabled = false,
  expanded,
  style,
}: BigButtonProps) {
  const theme = useTheme();
  const resolvedVariant: BigButtonVariant = selected ? 'accent' : variant;

  const backgroundColor =
    resolvedVariant === 'primary'
      ? theme.colors.primary
      : resolvedVariant === 'accent'
        ? theme.colors.controlAccent
        : theme.colors.card;

  const textColor =
    resolvedVariant === 'primary'
      ? theme.colors.onPrimary
      : resolvedVariant === 'accent'
        ? theme.colors.onControlAccent
        : resolvedVariant === 'option'
          ? theme.colors.textPrimary
          : theme.colors.primaryText;

  const showHairline =
    resolvedVariant === 'secondary' || resolvedVariant === 'option';

  const height =
    size === 'selection' ? theme.size.selectionButtonHeight : theme.size.buttonMinHeight;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: theme.colors.pressFeedback }}
      style={[
        styles.button,
        {
          backgroundColor,
          borderRadius: theme.radius,
          minHeight: height,
          borderWidth: showHairline
            ? Platform.OS === 'android'
              ? 1
              : StyleSheet.hairlineWidth
            : 0,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {pressed && !disabled && Platform.OS !== 'android' ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.pressFeedback }]} />
          ) : null}
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
        </>
      )}
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
