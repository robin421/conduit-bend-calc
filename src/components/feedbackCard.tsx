import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { openFeedback } from '../lib/feedback';
import { useTheme } from '../theme';
import BigButton from './bigButton';
import Card from './card';

export default function FeedbackCard() {
  const theme = useTheme();
  const busy = useRef(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);
  return <Card style={{ gap: theme.spacing.sm }}>
    <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>Report a problem or suggest an improvement</Text>
    <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary, lineHeight: 20 }}>Open our feedback form in your browser. App version, system and language are included. Tickets may be publicly visible; leave out personal and payment details. Individual replies are not guaranteed.</Text>
    <BigButton title={opening ? 'Opening feedback…' : 'Send feedback'} variant="secondary" disabled={opening} onPress={() => {
      if (busy.current) return;
      busy.current = true;
      setOpening(true);
      setError(false);
      void openFeedback().catch(() => setError(true)).finally(() => { busy.current = false; setOpening(false); });
    }} />
    {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.error, fontSize: theme.fontSize.secondary }}>Could not open the feedback form. Check your connection and browser, then try again. Your calculations are kept.</Text> : null}
  </Card>;
}
