import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import appConfig from '../../app.json';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import { useI18n } from '../i18n';
import { buildFeedbackUrl } from '../lib/feedbackLink';
import { getFeedbackScreenCopy } from '../lib/feedbackScreenCopy';
import type { RootStackParamList } from '../navigation/rootStackTypes';
import { useTheme } from '../theme';

export default function FeedbackScreen() {
  const theme = useTheme();
  const { lang } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const copy = useMemo(() => getFeedbackScreenCopy(lang), [lang]);

  const [reloadKey, setReloadKey] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const feedbackUrl = useMemo(
    () =>
      buildFeedbackUrl({
        version: appConfig.expo.version,
        platform: Platform.OS,
        language: lang,
      }),
    [lang],
  );

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('RootTabs');
    }
  };

  const handleRetry = () => {
    setLoadError(false);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.primary,
            borderBottomColor: theme.colors.border,
            paddingHorizontal: theme.spacing.sm,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.backLabel}
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? { backgroundColor: theme.colors.pressFeedback } : null,
          ]}
        >
          <Text
            style={[
              styles.backText,
              {
                color: theme.colors.onPrimary,
                fontSize: theme.fontSize.body,
                fontWeight: theme.fontWeight.medium,
              },
            ]}
          >
            {'← '}
            {copy.backLabel}
          </Text>
        </Pressable>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[
            styles.headerTitle,
            {
              color: theme.colors.onPrimary,
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.semibold,
            },
          ]}
        >
          {copy.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loadError ? (
        <View style={[styles.errorContainer, { padding: theme.spacing.md }]}>
          <Card style={[styles.errorCard, { borderColor: theme.colors.error, gap: theme.spacing.sm }]}>
            <Text
              accessibilityRole="alert"
              style={{
                color: theme.colors.error,
                fontSize: theme.fontSize.body,
                fontWeight: theme.fontWeight.semibold,
              }}
            >
              {copy.submitErrorTitle}
            </Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.secondary,
                lineHeight: 20,
              }}
            >
              {copy.submitErrorNetwork}
            </Text>
            <BigButton title={copy.retryButton} variant="secondary" onPress={handleRetry} />
          </Card>
        </View>
      ) : (
        <View style={styles.frameWrapper}>
          <iframe
            key={reloadKey}
            src={feedbackUrl}
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              border: 'none',
              minHeight: 560,
            }}
            title="Send Feedback"
            onError={() => setLoadError(true)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  backText: {
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: 72,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    width: '100%',
    maxWidth: 480,
  },
  frameWrapper: {
    flex: 1,
    width: '100%',
    minHeight: 560,
  },
});
