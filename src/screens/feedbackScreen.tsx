import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FeedbackScreenContent from '../components/feedbackScreenContent';
import { useI18n } from '../i18n';
import { getFeedbackScreenCopy } from '../lib/feedbackScreenCopy';
import type { RootStackParamList } from '../navigation/rootStackTypes';
import { useTheme } from '../theme';

export default function FeedbackScreen() {
  const theme = useTheme();
  const { lang } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const copy = useMemo(() => getFeedbackScreenCopy(lang), [lang]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('RootTabs');
    }
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

      <FeedbackScreenContent onBack={handleBack} />
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
});
