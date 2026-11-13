import { useState } from 'react';
import { Platform, Text } from 'react-native';
import { openPlayStoreListing } from '../lib/inAppReview';
import { useTheme } from '../theme';
import Card from './card';
import BigButton from './bigButton';

export default function RatingCard({ source }: { source: 'home' | 'reference' }) {
  const theme = useTheme();
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState(false);
  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>
        Rate Conduit Bend Calc
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary, lineHeight: 20 }}>
        {Platform.OS === 'web' ? 'Use the Android app? Share your experience on Google Play.' : 'Share your experience on Google Play. Your review helps other electricians choose their tools.'}
      </Text>
      <BigButton title={opening ? 'Opening Google Play…' : 'Rate on Google Play'} variant="secondary" disabled={opening} onPress={() => {
        setOpening(true);
        void openPlayStoreListing(source).then((ok) => setError(!ok)).finally(() => setOpening(false));
      }} />
      {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>Could not open Google Play. Check your connection and try again.</Text> : null}
    </Card>
  );
}
