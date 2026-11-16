import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import AppBrandBar from '../components/appBrandBar';
import FeedbackScreenContent from '../components/feedbackScreenContent';
import LanguageSwitcher from '../components/languageSwitcher';
import { useI18n } from '../i18n';
import { getFeedbackScreenCopy } from '../lib/feedbackScreenCopy';
import type { RootStackParamList } from '../navigation/rootStackTypes';
import { isWideDesktopViewport, workspaceMaxWidth } from '../seo/calculatorNav';
import { useTheme } from '../theme';

export default function FeedbackScreen() {
  const theme = useTheme();
  const { lang } = useI18n();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const copy = useMemo(() => getFeedbackScreenCopy(lang), [lang]);

  const wideDesktop = isWideDesktopViewport(width);
  const barMaxWidth = workspaceMaxWidth(width);
  const horizontalPad = wideDesktop ? 24 : theme.spacing.md;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('RootTabs');
    }
  };

  const handleHome = () => {
    navigation.navigate('RootTabs');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        accessibilityRole="header"
        style={[styles.brandBar, { backgroundColor: theme.colors.primary }]}
      >
        <View
          style={[
            styles.brandInner,
            { maxWidth: barMaxWidth, paddingHorizontal: horizontalPad },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={handleHome}
            style={(state) => {
              const { focused } = state as { focused?: boolean };
              return [
                styles.brandTrigger,
                Platform.OS === 'web' && focused
                  ? ({
                      outlineStyle: 'solid',
                      outlineWidth: 2,
                      outlineColor: theme.colors.accent,
                    } as object)
                  : null,
              ];
            }}
          >
            <AppBrandBar tone="header" />
          </Pressable>
          <LanguageSwitcher tone="header" />
        </View>
      </View>

      <View
        style={[
          styles.breadcrumbBar,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.breadcrumbInner,
            { maxWidth: barMaxWidth, paddingHorizontal: horizontalPad },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.backLabel}
            onPress={handleBack}
            style={(state) => {
              const { hovered, focused } = state as {
                hovered?: boolean;
                focused?: boolean;
              };
              return [
                styles.backLink,
                { borderRadius: theme.radius },
                Platform.OS === 'web' && hovered
                  ? { backgroundColor: theme.colors.background }
                  : null,
                Platform.OS === 'web' && focused
                  ? ({
                      outlineStyle: 'solid',
                      outlineWidth: 2,
                      outlineColor: theme.colors.accentText,
                    } as object)
                  : null,
              ];
            }}
          >
            <Text
              style={{
                color: theme.colors.primaryText,
                fontSize: theme.fontSize.secondary,
                fontWeight: theme.fontWeight.semibold,
              }}
            >
              {'← '}
              {copy.backLabel}
            </Text>
          </Pressable>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            /
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.fontSize.secondary,
              fontWeight: theme.fontWeight.semibold,
              flexShrink: 1,
            }}
          >
            {copy.title}
          </Text>
        </View>
      </View>

      <FeedbackScreenContent
        onBack={handleBack}
        contentMaxWidth={680}
        contentPadding={width >= 600 ? 24 : theme.spacing.md}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  brandBar: {
    height: 56,
    width: '100%',
    justifyContent: 'center',
  },
  brandInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    alignSelf: 'center',
    height: 56,
  },
  brandTrigger: {
    borderRadius: 6,
  },
  breadcrumbBar: {
    height: 40,
    width: '100%',
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  breadcrumbInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    alignSelf: 'center',
    height: 40,
  },
  backLink: {
    minHeight: 32,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
});
