import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PRODUCT_NAME } from '../seo/brand';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

/** 应用页头：复用真实图标与产品名，不用公司字标替代产品身份。 */
export default function AppBrandBar({ tone = 'surface', onMenuPress }: {
  tone?: 'surface' | 'header';
  onMenuPress?: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const color = tone === 'header' ? theme.colors.onPrimary : theme.colors.textPrimary;
  const iconSize = tone === 'header' ? 32 : 28;
  const focusOutlineColor = tone === 'header' ? theme.colors.accent : theme.colors.accentText;
  return <View accessibilityRole="header" accessibilityLabel={PRODUCT_NAME} style={styles.bar}>
    {onMenuPress ? <Pressable accessibilityRole="button" accessibilityLabel={t('brand.menuLabel')} onPress={onMenuPress}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }} android_ripple={{ color: theme.colors.pressFeedback }}
      style={(state) => {
        const { hovered, focused } = state as { hovered?: boolean; focused?: boolean };
        return [
          styles.menuButton,
          { borderRadius: theme.radius },
          Platform.OS === 'web' && hovered ? { backgroundColor: theme.colors.border } : null,
          Platform.OS === 'web' && focused ? { outlineStyle: 'solid', outlineWidth: 2, outlineColor: focusOutlineColor } as object : null,
        ];
      }}>
      <Text style={{ fontSize: 18, lineHeight: 22, color }}>☰</Text>
    </Pressable> : null}
    <Image source={require('../../assets/icon.png')} accessible={false} accessibilityIgnoresInvertColors resizeMode="contain"
      style={{ width: iconSize, height: iconSize, borderRadius: theme.radius }} />
    <Text numberOfLines={1} style={{ color, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold, flexShrink: 1 }}>{PRODUCT_NAME}</Text>
  </View>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  menuButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
});
