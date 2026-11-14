import { NavigationContext } from '@react-navigation/native';
import { useContext, useRef, useState } from 'react';
import { Text } from 'react-native';

import { useI18n } from '../i18n';
import { openFeedback } from '../lib/feedback';
import { trackGrowthEvent } from '../lib/growth';
import { useTheme } from '../theme';
import BigButton from './bigButton';
import Card from './card';

export default function FeedbackCard() {
  const theme = useTheme();
  const { t } = useI18n();
  const navigation = useContext(NavigationContext);
  const busy = useRef(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.fontSize.body,
          fontWeight: theme.fontWeight.semibold,
        }}
      >
        {t('feedback.cardTitle')}
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
          lineHeight: 20,
        }}
      >
        {t('feedback.cardBody')}
      </Text>
      <BigButton
        title={opening ? t('feedback.openingButton') : t('feedback.sendButton')}
        variant="secondary"
        disabled={opening}
        onPress={() => {
          if (busy.current) return;
          setError(false);
          trackGrowthEvent('feedback_opened', { source: 'feedback_card' });
          if (navigation && typeof navigation.navigate === 'function') {
            navigation.navigate('Feedback' as never);
            return;
          }
          busy.current = true;
          setOpening(true);
          void openFeedback()
            .catch(() => setError(true))
            .finally(() => {
              busy.current = false;
              setOpening(false);
            });
        }}
      />
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.colors.error, fontSize: theme.fontSize.secondary }}
        >
          {t('feedback.openError')}
        </Text>
      ) : null}
    </Card>
  );
}
