import { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { formatDecimalInches } from '../lib/imperial';
import { useI18n } from '../i18n';
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
  /** 软键盘类型；缺省按单位自动选择。 */
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'numbers-and-punctuation';
  /**
   * HTML `inputmode`：调起原生数字键盘而非全键盘（T62 硬指标）。
   * 缺省时按单位自动选择：公制用 `numeric`，小数英寸用 `decimal`。
   * 调用方显式传了 keyboardType 时不覆盖，避免影响内部计算器屏。
   */
  inputMode?: 'numeric' | 'decimal' | 'text';
  style?: StyleProp<ViewStyle>;
}

/** 分数英寸输入的三个数字框（整英寸 / 分子 / 分母）。 */
interface FractionalParts {
  whole: string;
  numerator: string;
  denominator: string;
}

const EMPTY_PARTS: FractionalParts = { whole: '', numerator: '', denominator: '' };

/** 只保留 0-9。分数框、公制框都走这里（`digits only`）。 */
function onlyDigits(text: string): string {
  return text.replace(/[^0-9]/g, '');
}

/** 只保留 0-9 与首个小数点（`decimal-pad` 数字键盘）。 */
function onlyDecimal(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) {
    return cleaned;
  }
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

function digitsToNumber(text: string): number {
  const digits = onlyDigits(text);
  return digits === '' ? 0 : Number(digits);
}

function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x;
}

/**
 * 外部 value（历史回填 / 单位切换 / 失焦格式化）→ 三个数字框。
 * 经英寸值反推，分数按 1/16 就近取整并约分，支持带英尺的写法。
 */
function splitFractional(value: string): FractionalParts {
  const inches = parseLength(value, 'fractional');
  if (inches === null || !Number.isFinite(inches) || inches < 0) {
    return EMPTY_PARTS;
  }
  const denominator = 16;
  const totalUnits = Math.round(inches * denominator);
  const whole = Math.floor(totalUnits / denominator);
  const remainder = totalUnits - whole * denominator;
  if (remainder === 0) {
    return { whole: whole > 0 ? String(whole) : '', numerator: '', denominator: '' };
  }
  const divisor = gcd(remainder, denominator);
  return {
    whole: whole > 0 ? String(whole) : '',
    numerator: String(remainder / divisor),
    denominator: String(denominator / divisor),
  };
}

/** 三个数字框 → 英寸值；分子非 0 而分母为空/0 时返回 null。 */
function parseFractionalParts(parts: FractionalParts): number | null {
  const whole = digitsToNumber(parts.whole);
  const numerator = digitsToNumber(parts.numerator);
  const denominator = digitsToNumber(parts.denominator);
  if (numerator > 0 && denominator === 0) {
    return null;
  }
  return whole + (denominator > 0 ? numerator / denominator : 0);
}

/** 三个数字框 → 规范化字符串，如 `6 1/2"`；空框省略对应段。 */
function partsToCanonical(parts: FractionalParts): string {
  const whole = digitsToNumber(parts.whole);
  const numerator = digitsToNumber(parts.numerator);
  const denominator = digitsToNumber(parts.denominator);
  const segments: string[] = [];
  const extraWhole = denominator > 0 ? Math.floor(numerator / denominator) : 0;
  let remainder = denominator > 0 ? numerator % denominator : 0;
  let reducedDenominator = denominator;
  if (remainder > 0 && reducedDenominator > 0) {
    const divisor = gcd(remainder, reducedDenominator);
    remainder /= divisor;
    reducedDenominator /= divisor;
  }
  const totalWhole = whole + extraWhole;
  if (totalWhole > 0) {
    segments.push(String(totalWhole));
  }
  if (remainder > 0 && reducedDenominator > 0) {
    segments.push(`${remainder}/${reducedDenominator}`);
  }
  return segments.length === 0 ? '' : `${segments.join(' ')}"`;
}

/** 约分 / 折叠假分数后的三个数字框（保留用户输入的分母，如 1/3）。 */
function reduceFractionalParts(parts: FractionalParts): FractionalParts {
  const whole = digitsToNumber(parts.whole);
  const numerator = digitsToNumber(parts.numerator);
  const denominator = digitsToNumber(parts.denominator);
  if (numerator <= 0 || denominator <= 0) {
    return { whole: whole > 0 ? String(whole) : '', numerator: '', denominator: '' };
  }
  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  const extraWhole = Math.floor(reducedNumerator / reducedDenominator);
  const remainder = reducedNumerator % reducedDenominator;
  const totalWhole = whole + extraWhole;
  return {
    whole: totalWhole > 0 ? String(totalWhole) : '',
    numerator: remainder > 0 ? String(remainder) : '',
    denominator: remainder > 0 ? String(reducedDenominator) : '',
  };
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
  const { t } = useI18n();
  const metric = unit === 'metric';
  const fractional = unit === 'fractional';

  // 分数英寸：三个数字框是本地状态；value 仍是单一来源（外部变化时回填）。
  const [parts, setParts] = useState<FractionalParts>(() => splitFractional(value));
  const lastEmittedRef = useRef(value);
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      lastEmittedRef.current = value;
      setParts(splitFractional(value));
    }
  }, [value]);

  const fractionalParsed = useMemo(() => {
    if (!fractional) {
      return null;
    }
    const blank =
      parts.whole === '' && parts.numerator === '' && parts.denominator === '';
    return blank ? null : parseFractionalParts(parts);
  }, [fractional, parts]);

  const valueParsed = useMemo(
    () => (fractional ? null : parseLength(value, unit)),
    [fractional, unit, value],
  );

  const parsed = fractional ? fractionalParsed : valueParsed;

  const isBlank = fractional
    ? parts.whole === '' && parts.numerator === '' && parts.denominator === ''
    : value.trim() === '';

  let error: string | null = null;
  if (!isBlank) {
    if (parsed === null) {
      error = fractional
        ? t('input.denominatorZero')
        : metric
          ? t('input.invalidMetric')
          : t('input.invalidImperial');
    } else if (parsed <= 0) {
      error = t('input.mustBePositive');
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

  const emit = (next: string) => {
    lastEmittedRef.current = next;
    onChangeText(next);
  };

  // 非分数单位：保持单框 + 原单位切换 / 失焦格式化行为，仅在敲键时限制字符。
  const handleTextChange = (text: string) => {
    onChangeText(metric ? onlyDigits(text) : unit === 'decimal' ? onlyDecimal(text) : text);
  };

  const handleBlur = () => {
    if (parsed !== null && !error) {
      const formatted = metric
        ? formatMetric(parsed)
        : `${formatDecimalInches(parsed)}"`;
      if (formatted !== value) {
        emit(formatted);
      }
    }
  };

  // 分数单位：任一数字框变化 → 合成规范化字符串回传；分母为 0 时保留上次合法值。
  const updateFractionalPart = (key: keyof FractionalParts, raw: string) => {
    const next: FractionalParts = { ...parts, [key]: onlyDigits(raw) };
    setParts(next);
    const numerator = digitsToNumber(next.numerator);
    const denominator = digitsToNumber(next.denominator);
    if (numerator > 0 && denominator === 0) {
      return;
    }
    const canonical = partsToCanonical(next);
    if (canonical !== value) {
      emit(canonical);
    }
  };

  // 失焦：约分 / 折叠假分数，并同步规范化字符串。
  const handleFractionalBlur = () => {
    if (error) {
      return;
    }
    const next = reduceFractionalParts(parts);
    setParts(next);
    const canonical = partsToCanonical(next);
    if (canonical !== value) {
      emit(canonical);
    }
  };

  const resolvedPlaceholder =
    placeholder ??
    (metric ? t('input.placeholderMetric') : t('input.placeholderImperial'));

  const resolvedInputMode =
    inputMode ?? (metric ? 'numeric' : unit === 'decimal' ? 'decimal' : undefined);
  const resolvedKeyboardType =
    keyboardType ??
    (metric ? 'numeric' : unit === 'decimal' ? 'decimal-pad' : 'numeric');

  const inputStyle = {
    backgroundColor: theme.colors.background,
    borderColor,
    borderRadius: theme.radius,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.title,
    paddingHorizontal: theme.spacing.md,
  };

  return (
    <View style={style}>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
          marginBottom: theme.spacing.sm,
        }}
      >
        {label}
      </Text>

      {fractional ? (
        <View
          style={[styles.fractionRow, { gap: theme.spacing.sm }]}
          accessibilityRole="none"
        >
          <TextInput
            value={parts.whole}
            onChangeText={(text) => updateFractionalPart('whole', text)}
            onBlur={handleFractionalBlur}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            inputMode="numeric"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={`${label} inches`}
            style={[styles.input, styles.fractionWhole, inputStyle]}
          />
          <TextInput
            value={parts.numerator}
            onChangeText={(text) => updateFractionalPart('numerator', text)}
            onBlur={handleFractionalBlur}
            placeholder="0"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            inputMode="numeric"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={`${label} numerator`}
            style={[styles.input, styles.fractionPart, inputStyle]}
          />
          <Text
            style={[
              styles.slash,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.title,
              },
            ]}
          >
            /
          </Text>
          <TextInput
            value={parts.denominator}
            onChangeText={(text) => updateFractionalPart('denominator', text)}
            onBlur={handleFractionalBlur}
            placeholder="16"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            inputMode="numeric"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={`${label} denominator`}
            style={[styles.input, styles.fractionPart, inputStyle]}
          />
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={handleTextChange}
          onBlur={handleBlur}
          placeholder={resolvedPlaceholder}
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType={resolvedKeyboardType}
          inputMode={resolvedInputMode}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, inputStyle]}
        />
      )}

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
  fractionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fractionWhole: {
    flex: 1.4,
  },
  fractionPart: {
    flex: 1,
  },
  slash: {
    fontVariant: ['tabular-nums'],
  },
});
