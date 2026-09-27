import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Card from '../components/card';
import {
  clearHistory,
  formatHistoryTime,
  loadHistory,
} from '../lib/history';
import type { HistoryEntry } from '../lib/historyStore';
import type { RootTabParamList } from '../navigation/rootTabs';
import { useTheme } from '../theme';

type Props = BottomTabScreenProps<RootTabParamList, 'History'>;

export default function HistoryScreen({ navigation }: Props) {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

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
    Alert.alert('Clear history', 'Delete all history entries?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          void clearHistory()
            .then(() => setEntries([]))
            .catch(() => undefined);
        },
      },
    ]);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        entries.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleClear}
            hitSlop={8}
            style={styles.headerButton}
          >
            <Text style={[styles.headerButtonText, { color: theme.colors.accent }]}>
              Clear
            </Text>
          </Pressable>
        ) : null,
    });
  }, [entries.length, handleClear, navigation, theme.colors.accent]);

  const handlePress = useCallback(
    (entry: HistoryEntry) => {
      const backfill = entry.params;
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
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: HistoryEntry }) => (
      <Pressable
        accessibilityRole="button"
        onPress={() => handlePress(item)}
        android_ripple={{ color: theme.colors.border }}
      >
        <Card style={styles.itemCard}>
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
              color: theme.colors.primary,
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.semibold,
              marginTop: theme.spacing.xs,
              fontVariant: ['tabular-nums'],
            }}
          >
            {item.resultSummary}
          </Text>
        </Card>
      </Pressable>
    ),
    [handlePress, theme],
  );

  if (entries.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.colors.background }]}>
        <Text
          style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.body }}
        >
          No calculations yet
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.xs,
          }}
        >
          Calculations you run will be recorded here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.listContent,
        { padding: theme.spacing.md, gap: theme.spacing.sm },
      ]}
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
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
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
