import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import appConfig from '../../app.json';
import {
  submitFeedbackTicket,
  validateFeedbackPayload,
} from '../../feedback-hub/clients/feedback-hub-rn';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import { useI18n } from '../i18n';
import { showAppToast } from '../lib/appToast';
import { FEEDBACK_PRODUCT } from '../lib/feedbackLink';
import {
  getFeedbackScreenCopy,
  type FeedbackCategory,
} from '../lib/feedbackScreenCopy';
import { trackGrowthEvent } from '../lib/growth';
import type { RootStackParamList } from '../navigation/rootStackTypes';
import { useTheme } from '../theme';

const CATEGORIES: readonly FeedbackCategory[] = ['bug', 'feature', 'formula', 'other'];

function resolveDiagnosticsOs(): string {
  if (Platform.OS === 'web') {
    return 'Web';
  }
  const raw = String(Platform.Version ?? '');
  const safe = /^\d+(\.\d+)*$/.test(raw) ? raw : 'unknown';
  if (Platform.OS === 'android') {
    return `Android API ${safe}`;
  }
  if (Platform.OS === 'ios') {
    return `iOS ${safe}`;
  }
  return Platform.OS;
}

export default function FeedbackScreen() {
  const theme = useTheme();
  const { lang } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const copy = useMemo(() => getFeedbackScreenCopy(lang), [lang]);

  const appVersion = appConfig.expo.version;
  const osLabel = useMemo(() => resolveDiagnosticsOs(), []);

  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null | undefined>(undefined);
  const busyRef = useRef(false);

  const trimmedLength = content.trim().length;
  const isSubmitted = submittedTicketId !== undefined;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('RootTabs');
    }
  };

  const handleSubmit = async () => {
    if (busyRef.current) return;

    const validation = validateFeedbackPayload({ category, content });
    if (!validation.valid) {
      if (validation.error === 'invalid_category') {
        setValidationError(copy.errorInvalidCategory);
      } else {
        setValidationError(copy.contentPlaceholder);
      }
      return;
    }

    setValidationError(null);
    setSubmitError(null);
    busyRef.current = true;
    setSubmitting(true);

    try {
      const result = await submitFeedbackTicket({
        pkg: FEEDBACK_PRODUCT,
        ver: appVersion,
        os: osLabel,
        lang,
        category,
        content,
        email,
      });

      if (result.ok) {
        trackGrowthEvent('feedback_submitted', { source: category });
        const toastMessage = result.ticketId
          ? `${copy.successTitle} (${result.ticketId})`
          : copy.successTitle;
        showAppToast(toastMessage);
        handleBack();
        return;
      } else {
        trackGrowthEvent('feedback_submit_failed', { source: category });
        if (result.error === 'timeout') {
          setSubmitError(copy.submitErrorTimeout);
        } else if (result.error === 'network_error' || result.error === 'fetch_unavailable') {
          setSubmitError(copy.submitErrorNetwork);
        } else {
          setSubmitError(result.error || copy.submitErrorNetwork);
        }
      }
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setSubmittedTicketId(undefined);
    setContent('');
    setValidationError(null);
    setSubmitError(null);
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { padding: theme.spacing.md, gap: theme.spacing.md },
          ]}
        >
          {isSubmitted ? (
            <Card style={{ gap: theme.spacing.md }}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radius,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.colors.accent,
                    fontSize: theme.fontSize.secondary,
                    fontWeight: theme.fontWeight.semibold,
                  }}
                >
                  {copy.successTitle}
                </Text>
              </View>

              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.fontSize.body,
                  lineHeight: 22,
                }}
              >
                {copy.successBody}
              </Text>

              {submittedTicketId ? (
                <View
                  style={[
                    styles.ticketBox,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius,
                      padding: theme.spacing.sm,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: theme.fontSize.secondary,
                    }}
                  >
                    {copy.ticketIdLabel}
                  </Text>
                  <Text
                    selectable
                    style={[
                      styles.tabularText,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.fontSize.body,
                        fontWeight: theme.fontWeight.semibold,
                      },
                    ]}
                  >
                    {submittedTicketId}
                  </Text>
                </View>
              ) : null}

              <View style={{ gap: theme.spacing.sm }}>
                <BigButton title={copy.doneButton} variant="primary" onPress={handleBack} />
                <BigButton
                  title={copy.submitAnotherButton}
                  variant="secondary"
                  onPress={handleResetForAnother}
                />
              </View>
            </Card>
          ) : (
            <>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.secondary,
                  lineHeight: 20,
                }}
              >
                {copy.subtitle}
              </Text>

              <Card style={{ gap: theme.spacing.sm }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: theme.fontSize.body,
                    fontWeight: theme.fontWeight.semibold,
                  }}
                >
                  {copy.categoryLabel}
                </Text>
                <View style={[styles.categoryGrid, { gap: theme.spacing.sm }]}>
                  {CATEGORIES.map((item) => {
                    const selected = category === item;
                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setCategory(item)}
                        style={({ pressed }) => [
                          styles.categoryOption,
                          {
                            borderRadius: theme.radius,
                            borderColor: selected ? theme.colors.primary : theme.colors.border,
                            backgroundColor: selected
                              ? theme.colors.accent
                              : theme.colors.background,
                            paddingHorizontal: theme.spacing.sm,
                            paddingVertical: theme.spacing.sm,
                            opacity: pressed && Platform.OS !== 'android' ? 0.9 : 1,
                          },
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            color: selected ? theme.colors.onAccent : theme.colors.textPrimary,
                            fontSize: theme.fontSize.secondary,
                            fontWeight: selected
                              ? theme.fontWeight.semibold
                              : theme.fontWeight.medium,
                          }}
                        >
                          {copy.categories[item]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>

              <Card style={{ gap: theme.spacing.sm }}>
                <View style={styles.labelRow}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: theme.fontSize.body,
                      fontWeight: theme.fontWeight.semibold,
                    }}
                  >
                    {copy.contentLabel}
                  </Text>
                  <Text
                    style={[
                      styles.tabularText,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.fontSize.secondary,
                      },
                    ]}
                  >
                    {`${trimmedLength}`}
                  </Text>
                </View>

                <TextInput
                  multiline
                  value={content}
                  onChangeText={(text) => {
                    setContent(text);
                    if (validationError) setValidationError(null);
                    if (submitError) setSubmitError(null);
                  }}
                  placeholder={copy.contentPlaceholder}
                  placeholderTextColor={theme.colors.textSecondary}
                  textAlignVertical="top"
                  editable={!submitting}
                  accessibilityLabel={copy.contentLabel}
                  style={[
                    styles.textArea,
                    {
                      color: theme.colors.textPrimary,
                      backgroundColor: theme.colors.background,
                      borderColor: validationError ? theme.colors.error : theme.colors.border,
                      borderRadius: theme.radius,
                      fontSize: theme.fontSize.body,
                      padding: theme.spacing.sm,
                    },
                  ]}
                />

                {validationError ? (
                  <Text
                    accessibilityRole="alert"
                    style={{
                      color: theme.colors.error,
                      fontSize: theme.fontSize.secondary,
                      fontWeight: theme.fontWeight.medium,
                    }}
                  >
                    {validationError}
                  </Text>
                ) : null}
              </Card>

              <Card style={{ gap: theme.spacing.sm }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: theme.fontSize.body,
                    fontWeight: theme.fontWeight.semibold,
                  }}
                >
                  {copy.emailLabel}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={copy.emailPlaceholder}
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                  accessibilityLabel={copy.emailLabel}
                  style={[
                    styles.singleInput,
                    {
                      color: theme.colors.textPrimary,
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius,
                      fontSize: theme.fontSize.body,
                      paddingHorizontal: theme.spacing.sm,
                    },
                  ]}
                />
              </Card>

              <Card style={{ gap: theme.spacing.xs }}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: theme.fontSize.secondary,
                    fontWeight: theme.fontWeight.semibold,
                  }}
                >
                  {copy.diagnosticsTitle}
                </Text>
                <View style={styles.diagRow}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
                    {copy.diagnosticsProduct}
                  </Text>
                  <Text
                    style={[
                      styles.tabularText,
                      { color: theme.colors.textPrimary, fontSize: theme.fontSize.secondary },
                    ]}
                  >
                    {FEEDBACK_PRODUCT}
                  </Text>
                </View>
                <View style={styles.diagRow}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
                    {copy.diagnosticsVersion}
                  </Text>
                  <Text
                    style={[
                      styles.tabularText,
                      { color: theme.colors.textPrimary, fontSize: theme.fontSize.secondary },
                    ]}
                  >
                    {appVersion}
                  </Text>
                </View>
                <View style={styles.diagRow}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
                    {copy.diagnosticsOs}
                  </Text>
                  <Text
                    style={[
                      styles.tabularText,
                      { color: theme.colors.textPrimary, fontSize: theme.fontSize.secondary },
                    ]}
                  >
                    {osLabel}
                  </Text>
                </View>
                <View style={styles.diagRow}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
                    {copy.diagnosticsLang}
                  </Text>
                  <Text
                    style={[
                      styles.tabularText,
                      { color: theme.colors.textPrimary, fontSize: theme.fontSize.secondary },
                    ]}
                  >
                    {lang}
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: theme.fontSize.secondary,
                    marginTop: theme.spacing.xs,
                    lineHeight: 18,
                  }}
                >
                  {copy.diagnosticsNote}
                </Text>
              </Card>

              {submitError ? (
                <Card
                  style={{
                    borderColor: theme.colors.error,
                    gap: theme.spacing.sm,
                  }}
                >
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
                    {submitError}
                  </Text>
                  <BigButton
                    title={copy.retryButton}
                    variant="secondary"
                    disabled={submitting}
                    onPress={() => {
                      void handleSubmit();
                    }}
                  />
                </Card>
              ) : null}
            </>
          )}
        </ScrollView>
        {!isSubmitted ? (
          <View
            style={[
              styles.footer,
              {
                backgroundColor: theme.colors.card,
                borderTopColor: theme.colors.border,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              },
            ]}
          >
            <View style={[styles.footerInner, { gap: theme.spacing.xs }]}>
              {validationError ? (
                <Text
                  accessibilityRole="alert"
                  style={{
                    color: theme.colors.error,
                    fontSize: theme.fontSize.secondary,
                    fontWeight: theme.fontWeight.medium,
                  }}
                >
                  {validationError}
                </Text>
              ) : null}
              <BigButton
                title={submitting ? copy.submittingButton : copy.submitButton}
                variant="accent"
                loading={submitting}
                disabled={submitting}
                onPress={() => {
                  void handleSubmit();
                }}
              />
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
  scrollContent: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 32,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryOption: {
    minHeight: 44,
    minWidth: '47%',
    flexGrow: 1,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabularText: {
    fontVariant: ['tabular-nums'],
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
  },
  singleInput: {
    minHeight: 44,
    borderWidth: 1,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  ticketBox: {
    borderWidth: 1,
    gap: 4,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerInner: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
});
