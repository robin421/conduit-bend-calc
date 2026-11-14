import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
  return <View accessibilityRole="header" accessibilityLabel={PRODUCT_NAME} style={styles.bar}>
    {onMenuPress ? <Pressable accessibilityRole="button" accessibilityLabel={t('brand.menuLabel')} onPress={onMenuPress}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }} android_ripple={{ color: theme.colors.pressFeedback }} style={styles.menuButton}>
      <Text style={{ fontSize: 18, lineHeight: 22, color }}>☰</Text>
    </Pressable> : null}
    <Image source={require('../../assets/icon.png')} accessible={false} accessibilityIgnoresInvertColors resizeMode="contain"
      style={{ width: iconSize, height: iconSize, borderRadius: theme.radius }} />
    <Text numberOfLines={1} style={{ color, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold, flexShrink: 1 }}>{PRODUCT_NAME}</Text>
  </View>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  menuButton: { minHeight: 28, minWidth: 32, alignItems: 'center', justifyContent: 'center' },
});
