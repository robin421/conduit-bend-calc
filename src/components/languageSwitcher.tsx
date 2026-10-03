/**
 * EN / ES 语言切换器（品牌栏下方 / 页脚使用）。
 *
 * 选中态用品牌橙，无阴影无渐变；两个按钮都是 32pt 高、40pt 宽，
 * 满足触控最小尺寸。切换会写 localStorage、改 `?lang=` 与 head（见 i18n/store）。
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LANG_LABELS, LANGS, useI18n } from '../i18n';
import { useTheme } from '../theme';

export default function LanguageSwitcher() {
  const theme = useTheme();
  const { lang, setLang } = useI18n();

  return (
    <View style={styles.row}>
      {LANGS.map((code) => {
        const selected = code === lang;
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={LANG_LABELS[code]}
            onPress={() => setLang(code)}
            hitSlop={6}
            style={[
              styles.button,
              {
                borderRadius: theme.radius,
                borderColor: selected ? theme.colors.accent : theme.colors.border,
                backgroundColor: selected
                  ? theme.colors.accent
                  : theme.colors.background,
              },
            ]}
          >
            <Text
              style={{
                color: selected
                  ? theme.colors.onAccent
                  : theme.colors.textSecondary,
                fontSize: theme.fontSize.secondary,
                fontWeight: theme.fontWeight.semibold,
              }}
            >
              {code.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: 32,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
