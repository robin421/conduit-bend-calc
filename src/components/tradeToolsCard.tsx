import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n';
import { trackGrowthEvent } from '../lib/growth';
import { BILLIN_TRADE_TOOLS, buildTradeToolPlayUrl } from '../lib/tradeToolsMatrix';
import { useTheme } from '../theme';
import Card from './card';
import { ChevronRightIcon } from './toolIcons';

export default function TradeToolsCard({ source }: { source: 'home' | 'reference' }) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <View style={{ gap: 2 }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          {t('tradeTools.title')}
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            lineHeight: 20,
          }}
        >
          {t('tradeTools.subtitle')}
        </Text>
      </View>

      <View>
        {BILLIN_TRADE_TOOLS.map((tool, index) => (
          <Pressable
            key={tool.id}
            accessibilityRole="link"
            accessibilityLabel={t('tradeTools.openA11y', { name: tool.title })}
            onPress={() => {
              trackGrowthEvent('cross_promo_tapped', {
                source,
                product_id: tool.packageId,
              });
              void Linking.openURL(buildTradeToolPlayUrl(tool.packageId)).catch(() => undefined);
            }}
            style={({ pressed }) => [
              styles.row,
              index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border } : null,
              pressed ? { opacity: 0.7 } : null,
            ]}
          >
            <View style={styles.textBlock}>
              <Text
                numberOfLines={1}
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.fontSize.secondary,
                  fontWeight: theme.fontWeight.semibold,
                }}
              >
                {tool.title}
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 13,
                  marginTop: 2,
                }}
              >
                {t(tool.descriptionKey)}
              </Text>
            </View>
            <ChevronRightIcon size={16} color={theme.colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
    paddingVertical: 10,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
});
