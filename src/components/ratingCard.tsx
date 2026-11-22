import { useState } from 'react';
import { Platform, Text } from 'react-native';
import { useI18n } from '../i18n';
import { openPlayStoreListing } from '../lib/inAppReview';
import { useTheme } from '../theme';
import Card from './card';
import BigButton from './bigButton';

export default function RatingCard({ source }: { source: 'home' | 'reference' }) {
  const theme = useTheme();
  const { t } = useI18n();
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState(false);
  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>
        {t('rating.title')}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary, lineHeight: 20 }}>
        {Platform.OS === 'web' ? t('rating.bodyWeb') : t('rating.bodyNative')}
      </Text>
      <BigButton title={opening ? t('rating.opening') : t('rating.button')} variant="secondary" disabled={opening} onPress={() => {
        setOpening(true);
        void openPlayStoreListing(source).then((ok) => setError(!ok)).finally(() => setOpening(false));
      }} />
      {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>{t('rating.error')}</Text> : null}
    </Card>
  );
}
