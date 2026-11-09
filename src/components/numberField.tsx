import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../theme';

interface NumberFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** 输入框右侧单位（A、V、ft…） */
  unit?: string;
  placeholder?: string;
  /** 非空时显示错误态 */
  error?: string;
  /** 只允许整数（导线根数） */
  integer?: boolean;
}

/** 电工计算器用的数字输入：大字号、等宽数字、非法输入显示错误态。遵循 Material 3 输入框视觉层级。 */
export default function NumberField({ label, value, onChangeText, unit, placeholder, error, integer }: NumberFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const activeBorderColor = error
    ? theme.colors.error
    : focused
      ? theme.colors.accent
      : theme.colors.border;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text
        style={{
          color: focused && !error ? theme.colors.accentText : theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
          fontWeight: focused ? theme.fontWeight.medium : theme.fontWeight.regular,
        }}
      >
        {label}
      </Text>
      <View
        style={[
          styles.box,
          {
            borderColor: activeBorderColor,
            borderWidth: error || focused ? 2 : 1,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius,
            paddingHorizontal: theme.spacing.md,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(integer ? t.replace(/[^0-9]/g, '') : t.replace(/[^0-9.]/g, ''))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={theme.colors.accent}
          cursorColor={theme.colors.accent}
          keyboardType={integer ? 'number-pad' : 'decimal-pad'}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          accessibilityLabel={label}
          style={[
            styles.input,
            { color: theme.colors.textPrimary, fontSize: theme.fontSize.title, fontVariant: ['tabular-nums'] },
          ]}
        />
        {unit ? (
          <Text style={{ color: theme.colors.accentText, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>
            {unit}
          </Text>
        ) : null}
      </View>
      {error ? <Text style={{ color: theme.colors.error, fontSize: theme.fontSize.secondary }}>{error}</Text> : null}
    </View>
  );
}

/** 解析数字输入：空串返回 null，非法返回 NaN。 */
export function parseNumberInput(text: string): number | null {
  const t = text.trim();
  if (t === '') return null;
  return /^\d*\.?\d+$|^\d+\.$/.test(t) ? Number(t) : Number.NaN;
}

const styles = StyleSheet.create({
  box: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
  },
});
