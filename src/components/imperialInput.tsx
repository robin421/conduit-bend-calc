import { useEffect, useMemo, useRef } from 'react';
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
import { formatMetric, parseLength, sanitizeInputForUnit, type UnitSystem } from '../lib/units';

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
  /**
   * HTML `inputmode`：调起原生数字键盘而非全键盘（T62 硬指标）。
   * 缺省时按单位自动选择：公制用 `numeric`，分数/小数英寸用 `decimal`
   * （decimal 仍是纯数字键盘，但带小数点，方便输入 6.5）。
   * 调用方显式传了 keyboardType 时不覆盖，避免影响内部计算器屏。
   */
  inputMode?: 'numeric' | 'decimal' | 'text';
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
  inputMode,
  style,
}: ImperialInputProps) {
  const theme = useTheme();
  const metric = unit === 'metric';

  // T62：数字输入框一律调数字键盘；仅当调用方显式指定 keyboardType 时不干预。
  const resolvedInputMode =
    inputMode ?? (keyboardType ? undefined : metric ? 'numeric' : 'decimal');

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

  // 单位切换时清理残留的旧单位符号（如 6" 切到 metric 后变 6），
  // 去掉符号仍解析失败则清空该框。所有长度输入框经由此组件集中处理。
  const prevUnitRef = useRef(unit);
  useEffect(() => {
    if (prevUnitRef.current !== unit) {
      prevUnitRef.current = unit;
      const sanitized = sanitizeInputForUnit(value, unit);
      if (sanitized !== value) {
        onChangeText(sanitized);
      }
    }
  }, [unit, value, onChangeText]);

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
        inputMode={resolvedInputMode}
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
