import { StyleSheet, Text, View } from 'react-native';

import BigButton from './bigButton';
import { useTheme } from '../theme';

interface OptionRowProps<T extends string | number> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  /** 选项显示文案（缺省为 String(option)） */
  format?: (option: T) => string;
  /** 每行最多几个（超过换行），缺省 4 */
  perRow?: number;
}

/** 一组单选按钮（材质、相数、管型、管径…），复用 BigButton 的 selection 样式。 */
export default function OptionRow<T extends string | number>({ label, options, value, onChange, format, perRow = 4 }: OptionRowProps<T>) {
  const theme = useTheme();
  const basis = `${100 / Math.min(perRow, options.length)}%` as const;
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>{label}</Text>
      <View style={[styles.wrap, { marginHorizontal: -theme.spacing.xs / 2 }]}>
        {options.map((o) => (
          <View key={String(o)} style={{ width: basis, padding: theme.spacing.xs / 2 }}>
            <BigButton
              title={format ? format(o) : String(o)}
              size="selection"
              selected={o === value}
              onPress={() => onChange(o)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
