import { useEffect, useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { formatImperial, parseImperial } from '../lib/imperial';
import { useTheme } from '../theme';

interface ImperialInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onParsedChange?: (inches: number | null) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export default function ImperialInput({
  label,
  value,
  onChangeText,
  onParsedChange,
  placeholder = `e.g. 2' 3-1/2"`,
  style,
}: ImperialInputProps) {
  const theme = useTheme();

  const parsed = useMemo(() => parseImperial(value), [value]);
  const isBlank = value.trim() === '';

  let error: string | null = null;
  if (!isBlank) {
    if (parsed === null) {
      error = 'Invalid format, e.g. 2\' 3-1/2"';
    } else if (parsed <= 0) {
      error = 'Must be greater than 0';
    }
  }

  useEffect(() => {
    onParsedChange?.(error ? null : parsed);
  }, [error, onParsedChange, parsed]);

  const borderColor = error ? theme.colors.error : theme.colors.border;

  const handleBlur = () => {
    if (parsed !== null && !error) {
      const formatted = formatImperial(parsed);
      if (formatted !== value) {
        onChangeText(formatted);
      }
    }
  };

  return (
    <View style={style}>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
          marginBottom: theme.spacing.xs,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.background,
            borderColor,
            borderRadius: theme.radius,
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.title,
            paddingHorizontal: theme.spacing.md,
          },
        ]}
      />
      {error ? (
        <Text
          style={{
            color: theme.colors.error,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.xs,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    fontVariant: ['tabular-nums'],
  },
});
