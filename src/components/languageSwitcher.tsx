/**
 * EN / ES 语言切换器（品牌栏下方 / 页脚使用）。
 *
 * 选中态用品牌橙，无阴影无渐变；两个按钮都是 32pt 高、40pt 宽，
 * 满足触控最小尺寸。切换会写 localStorage、改 `?lang=` 与 head（见 i18n/store）。
 */

import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { LANG_LABELS, LANGS, useI18n } from '../i18n';
import { logAmplitudeEvent } from '../lib/amplitude';
import { useTheme } from '../theme';

export default function LanguageSwitcher({ tone = 'surface' }: { tone?: 'surface' | 'header' }) {
  const theme = useTheme();
  const { lang, setLang } = useI18n();
  const isHeader = tone === 'header';

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
            onPress={() => {
              if (code !== lang) {
                logAmplitudeEvent('language_changed', { lang: code });
              }
              setLang(code);
            }}
            hitSlop={4}
            style={(state) => {
              const { hovered, focused } = state as { hovered?: boolean; focused?: boolean };
              return [
                isHeader ? styles.headerButton : styles.button,
                {
                  borderRadius: theme.radius,
                  borderColor: isHeader
                    ? selected
                      ? theme.colors.accent
                      : 'rgba(255,255,255,0.22)'
                    : selected
                      ? theme.colors.accentText
                      : Platform.OS === 'web' && hovered
                        ? theme.colors.textSecondary
                        : theme.colors.border,
                  backgroundColor: isHeader
                    ? selected
                      ? 'rgba(244,195,23,0.16)'
                      : Platform.OS === 'web' && hovered
                        ? 'rgba(255,255,255,0.1)'
                        : 'transparent'
                    : selected
                      ? theme.colors.controlAccent
                      : theme.colors.background,
                },
                Platform.OS === 'web' && focused
                  ? ({
                      outlineStyle: 'solid',
                      outlineWidth: 2,
                      outlineColor: isHeader ? theme.colors.accent : theme.colors.accentText,
                    } as object)
                  : null,
              ];
            }}
          >
            <Text
              style={{
                color: isHeader
                  ? selected
                    ? theme.colors.accent
                    : 'rgba(255,255,255,0.82)'
                  : selected
                    ? theme.colors.onControlAccent
                    : theme.colors.textSecondary,
                fontSize: isHeader ? 12 : theme.fontSize.secondary,
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
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minHeight: 32,
    minWidth: 36,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
