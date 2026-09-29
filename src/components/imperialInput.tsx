import { useEffect, useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { formatDecimalInches, formatImperial } from '../lib/imperial';
import { useTheme } from '../theme';
import { formatMetric, parseLength, type UnitSystem } from '../lib/units';

interface ImperialInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onParsedChange?: (inches: number | null) => void;
  placeholder?: string;
  /** 单位系统；缺省 fractional（分数英寸）。 */
  unit?: UnitSystem;
  /** 软键盘类型；缺省不指定（系统默认）。 */
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'numbers-and-punctuation';
  style?: StyleProp<ViewStyle>;
}

export default function ImperialInput({
  label,
  value,
  onChangeText,
  onParsedChange,
  placeholder,
  unit = 'fractional',
  keyboardType,
  style,
}: ImperialInputProps) {
  const theme = useTheme();
  const metric = unit === 'metric';

  const parsed = useMemo(() => parseLength(value, unit), [unit, value]);
  const isBlank = value.trim() === '';

  let error: string | null = null;
  if (!isBlank) {
    if (parsed === null) {
      error = metric ? 'Invalid format, e.g. 150 mm' : 'Invalid format, e.g. 2\' 3-1/2"';
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
      const formatted =
        unit === 'metric'
          ? formatMetric(parsed)
          : unit === 'decimal'
            ? `${formatDecimalInches(parsed)}"`
            : formatImperial(parsed);
      if (formatted !== value) {
        onChangeText(formatted);
      }
    }
  };

  const resolvedPlaceholder = placeholder ?? (metric ? 'e.g. 150 mm' : `e.g. 2' 3-1/2"`);

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
        placeholder={resolvedPlaceholder}
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType={keyboardType}
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
