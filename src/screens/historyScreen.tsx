import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import BigButton from '../components/bigButton';
import Card from '../components/card';
import { useI18n } from '../i18n';
import { isWideDesktopViewport, workspaceMaxWidth } from '../seo/calculatorNav';
import { showAppToast } from '../lib/appToast';
import { trackGrowthEvent } from '../lib/growth';
import { exportRecentHistory } from '../lib/proContinuation';
import {
  clearHistory,
  formatHistoryTime,
  loadHistory,
  HISTORY_LIMIT,
} from '../lib/history';
import { useUnitSystem } from '../lib/unitStore';
import type { HistoryEntry } from '../lib/historyStore';
import { useProAccess } from '../lib/proStore';
import type { RootTabParamList } from '../navigation/rootTabs';
import { useTheme } from '../theme';

type Props = BottomTabScreenProps<RootTabParamList, 'History'>;

export default function HistoryScreen({ navigation }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && isWideDesktopViewport(width);
  const maxWidth = isWideWeb ? workspaceMaxWidth(width) : 720;
  const isFocused = useIsFocused();
  const { access } = useProAccess();
  const { setUnit } = useUnitSystem();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const visibleEntries = access === 'unlocked' ? entries : entries.slice(0, 5);
  const hasHiddenEntries = access === 'locked' && entries.length > 5;

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    let active = true;
    void loadHistory()
      .then((list) => {
        if (active) {
          setEntries(list);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isFocused]);

  const handleClear = useCallback(() => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined' && typeof window.confirm === 'function'
          ? window.confirm(t('history.clearConfirm'))
          : true;
      if (confirmed) {
        void clearHistory()
          .then(() => setEntries([]))
          .catch(() => undefined);
      }
      return;
    }
    Alert.alert(t('history.clearTitle'), t('history.clearConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('history.clear'),
        style: 'destructive',
        onPress: () => {
          void clearHistory()
            .then(() => setEntries([]))
            .catch(() => undefined);
        },
      },
    ]);
  }, [t]);

  const handleExport = useCallback(() => {
    if (access === 'locked') {
      navigation.navigate('CalcHome', {
        screen: 'Paywall',
        params: { triggerSource: 'history_export', intent: { kind: 'export' } },
      });
      return;
    }
    void exportRecentHistory(() => navigation.isFocused()).catch((error) => {
      if (!navigation.isFocused()) return;
      const message = error instanceof Error ? error.message : t('history.tryAgain');
      if (Platform.OS === 'web') {
        showAppToast(t('history.exportErrorToast', { message }));
      } else {
        Alert.alert(t('history.exportErrorTitle'), message);
      }
    });
  }, [access, entries, navigation, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        entries.length > 0 ? (
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              onPress={handleExport}
              hitSlop={8}
              android_ripple={{ color: theme.colors.pressFeedback, borderless: true }}
              style={styles.headerButton}
            >
              <Text style={[styles.headerButtonText, { color: theme.colors.accent }]}>
                {t('history.export')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleClear}
              hitSlop={8}
              android_ripple={{ color: theme.colors.pressFeedback, borderless: true }}
              style={styles.headerButton}
            >
              <Text style={[styles.headerButtonText, { color: theme.colors.textSecondary }]}>
                {t('history.clear')}
              </Text>
            </Pressable>
          </View>
        ) : null,
    });
  }, [
    entries.length,
    handleClear,
    handleExport,
    navigation,
    t,
    theme.colors.accent,
    theme.colors.pressFeedback,
    theme.colors.textSecondary,
  ]);

  const handlePress = useCallback(
    (entry: HistoryEntry) => {
      const backfill = entry.params;
      const unitMode = backfill.unit ?? 'fractional';
      trackGrowthEvent('history_reused', {
        bend_type: entry.kind,
        unit_system: unitMode,
      });
      setUnit(unitMode);
      switch (entry.kind) {
        case 'offset':
          navigation.navigate('CalcHome', {
            screen: 'Offset',
            params: { backfill },
          });
          break;
        case 'stub':
          navigation.navigate('CalcHome', {
            screen: 'Stub',
            params: { backfill },
          });
          break;
        case 'threePointSaddle':
          navigation.navigate('CalcHome', {
            screen: 'ThreePointSaddle',
            params: { backfill },
          });
          break;
        case 'fourPointSaddle':
          navigation.navigate('CalcHome', {
            screen: 'FourPointSaddle',
            params: { backfill },
          });
          break;
        case 'rollingOffset':
          navigation.navigate('CalcHome', {
            screen: 'RollingOffset',
            params: { backfill },
          });
          break;
        case 'kicked90':
          navigation.navigate('CalcHome', {
            screen: 'Kicked90',
            params: { backfill },
          });
          break;
      }
    },
    [navigation, setUnit],
  );

  const renderItem = useCallback(
    ({ item }: { item: HistoryEntry }) => (
      <Card
        accessibilityRole="button"
        onPress={() => handlePress(item)}
        style={[styles.itemCard, isWideWeb ? styles.wideItemCard : null]}
      >
        <View style={styles.itemHeader}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.semibold,
            }}
          >
            {item.title}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatHistoryTime(item.timestamp)}
          </Text>
        </View>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.xs,
            fontVariant: ['tabular-nums'],
          }}
        >
          {item.inputSummary}
        </Text>
        <Text
          style={{
            color: theme.colors.primaryText,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
            marginTop: theme.spacing.xs,
            fontVariant: ['tabular-nums'],
          }}
        >
          {item.resultSummary}
        </Text>
      </Card>
    ),
    [handlePress, isWideWeb, theme],
  );

  const renderFooter = useCallback(() => {
    if (!hasHiddenEntries) {
      return null;
    }
    const hiddenCount = Math.max(0, entries.length - 5);
    return (
      <Card style={styles.historyLimitCard}>
        <View style={styles.historyLimitHeader}>
          <Text
            style={[
              styles.historyLimitTitle,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.body,
                fontWeight: theme.fontWeight.semibold,
                fontVariant: ['tabular-nums'],
              },
            ]}
          >
            {hiddenCount === 1
              ? t('history.limitHiddenTitleOne', { count: entries.length })
              : t('history.limitHiddenTitleMany', { count: entries.length, hidden: hiddenCount })}
          </Text>
          <Text
            style={[
              styles.historyLimitSubtitle,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.secondary,
                marginTop: theme.spacing.xs,
              },
            ]}
          >
            {t('history.limitSubtitle', { limit: HISTORY_LIMIT })}
          </Text>
        </View>
        <View style={{ marginTop: theme.spacing.md }}>
          <BigButton
            title={t('history.limitCta', { limit: HISTORY_LIMIT })}
            variant="primary"
            onPress={() => {
              navigation.navigate('CalcHome', {
                screen: 'Paywall',
                params: { triggerSource: 'history_limit', intent: { kind: 'history' } },
              });
            }}
          />
        </View>
      </Card>
    );
  }, [entries.length, hasHiddenEntries, navigation, t, theme]);

  const renderHeader = useCallback(() => {
    if (Platform.OS !== 'web' || entries.length === 0) {
      return null;
    }
    return (
      <Card style={styles.webToolbarCard}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            fontWeight: theme.fontWeight.medium,
            fontVariant: ['tabular-nums'],
          }}
        >
          {entries.length === 1
            ? t('history.entryCountOne', { count: entries.length })
            : t('history.entryCountMany', { count: entries.length })}
        </Text>
        <View style={styles.webToolbarActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('history.export')}
            onPress={handleExport}
            style={({ pressed }) => [
              styles.webActionButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: pressed ? theme.colors.pressFeedback : theme.colors.background,
                borderRadius: theme.radius,
              },
            ]}
          >
            <Text
              style={[
                styles.webActionButtonText,
                { color: theme.colors.accentText },
              ]}
            >
              {t('history.export')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('history.clear')}
            onPress={handleClear}
            style={({ pressed }) => [
              styles.webActionButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: pressed ? theme.colors.pressFeedback : theme.colors.background,
                borderRadius: theme.radius,
              },
            ]}
          >
            <Text
              style={[
                styles.webActionButtonText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('history.clear')}
            </Text>
          </Pressable>
        </View>
      </Card>
    );
  }, [entries.length, handleClear, handleExport, t, theme]);

  if (entries.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.colors.background }]}>
        <View
          style={[
            styles.emptyIconCircle,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.emptyIcon, { color: theme.colors.textSecondary }]}>
            ↺
          </Text>
        </View>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
            marginTop: theme.spacing.md,
          }}
        >
          {t('history.emptyTitle')}
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.xs,
            textAlign: 'center',
            maxWidth: 260,
          }}
        >
          {t('history.emptyBody')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      key={isWideWeb ? 'wide-2' : 'narrow-1'}
      numColumns={isWideWeb ? 2 : 1}
      columnWrapperStyle={isWideWeb ? { gap: theme.spacing.sm } : undefined}
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.listContent,
        {
          maxWidth,
          padding: isWideWeb ? 24 : theme.spacing.md,
          gap: theme.spacing.sm,
        },
      ]}
      data={visibleEntries}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  itemCard: {
    gap: 0,
    padding: 14,
  },
  wideItemCard: {
    flex: 1,
    minWidth: 0,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  webToolbarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  webToolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webActionButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  webActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  historyLimitCard: {
    marginTop: 8,
    padding: 16,
  },
  historyLimitHeader: {
    alignItems: 'flex-start',
  },
  historyLimitTitle: {
    fontWeight: '700',
  },
  historyLimitSubtitle: {
    lineHeight: 18,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: Platform.OS === 'android' ? 1 : StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 28,
  },
});
