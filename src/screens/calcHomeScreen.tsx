import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppState,
  InteractionManager,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import BigButton from '../components/bigButton';
import Card from '../components/card';
import RatingCard from '../components/ratingCard';
import FeedbackCard from '../components/feedbackCard';
import WebQuickCalculator from '../components/webQuickCalculator';
import {
  FOUR_POINT_SADDLE_ICON,
  THREE_POINT_SADDLE_ICON,
  HISTORY_CALCULATOR_SCREENS,
} from '../lib/homeContent';
import { loadHistory, subscribeHistory } from '../lib/history';
import type { HistoryEntry } from '../lib/historyStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';
import { requestReviewWhenIdle } from '../lib/inAppReview';
import { loadPendingProTask } from '../lib/pendingProIntent';
import type { PendingProTask } from '../lib/pendingProTaskStore';
import { getCurrentProState, useProAccess } from '../lib/proStore';
import { useUnitSystem } from '../lib/unitStore';
import { trackEvent } from '../lib/analytics';
import { logFirebaseUnitSystemChanged } from '../lib/firebase';
import type { UnitSystem } from '../lib/units';

type Props = NativeStackScreenProps<CalcStackParamList, 'CalcHome'>;

interface CalculatorEntry {
  key: keyof CalcStackParamList;
  icon: string;
  name: string;
  description: string;
  group: 'bending' | 'electrical' | 'bender';
  /** Pro 功能：未购买时点击进付费墙（仅校准类，计算器不再 gate）。 */
  pro?: boolean;
}

const ENTRIES: CalculatorEntry[] = [
  { key: 'Offset', group: 'bending', icon: '⌐', name: 'Offset Bend', description: 'Move the run around an obstacle' },
  { key: 'Stub', group: 'bending', icon: '∟', name: '90° Stub', description: 'Turn up to a measured height' },
  { key: 'ThreePointSaddle', group: 'bending', icon: THREE_POINT_SADDLE_ICON, name: '3-Point Saddle', description: 'Cross a narrow obstacle with three bends' },
  { key: 'FourPointSaddle', group: 'bending', icon: FOUR_POINT_SADDLE_ICON, name: '4-Point Saddle', description: 'Cross a wide obstacle with a flat top' },
  { key: 'RollingOffset', group: 'bending', icon: '⤢', name: 'Rolling Offset', description: 'Move the run both up and sideways' },
  { key: 'Kicked90', group: 'bending', icon: '∠', name: 'Kicked 90°', description: 'Combine a 90° bend with an offset' },
  { key: 'ConduitFill', group: 'electrical', icon: '◍', name: 'Conduit Fill', description: 'How many THHN wires fit (NEC Ch. 9)' },
  { key: 'VoltageDrop', group: 'electrical', icon: '⚡', name: 'Voltage Drop', description: 'Drop % and wire size for 3% / 5%' },
  { key: 'WireSize', group: 'electrical', icon: '⌇', name: 'Wire Size', description: 'Minimum AWG from amps (NEC 310.16)' },
  { key: 'GuidedCalibration', group: 'bender', icon: '◎', name: 'Dial In My Bender', description: 'Match take-up or bend radius to your actual bender', pro: true },
];

const GROUPS = [
  { key: 'bending', title: 'Conduit bending' },
  { key: 'electrical', title: 'Electrical calculators' },
  { key: 'bender', title: 'My bender' },
] as const;

export default function CalcHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { unit, setUnit } = useUnitSystem();
  const { access, phase, pendingPurchase } = useProAccess();
  const [pendingTask, setPendingTask] = useState<PendingProTask | null>(null);
  const [recent, setRecent] = useState<HistoryEntry | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadPendingProTask().then((task) => {
      if (active) setPendingTask(task);
    });
    const task = InteractionManager.runAfterInteractions(() => {
      void requestReviewWhenIdle(() => active && navigation.isFocused()
        && AppState.currentState === 'active' && !Keyboard.isVisible()
        && getCurrentProState().phase === 'idle');
    });
    return () => { active = false; task.cancel(); };
  }, [navigation, access, phase]));


  useFocusEffect(useCallback(() => {
    let active = true;
    let updated = false;
    const unsubscribe = subscribeHistory((entries) => {
      updated = true;
      if (active) setRecent(entries[0] ?? null);
    });
    void loadHistory().then((entries) => {
      if (active && !updated) setRecent(entries[0] ?? null);
    }).catch(() => undefined);
    return () => { active = false; unsubscribe(); };
  }, []));

  const handleUnitChange = (next: UnitSystem) => {
    if (next !== unit) {
      trackEvent('unit_changed', { unit: next });
      logFirebaseUnitSystemChanged(unit, next);
    }
    setUnit(next);
  };

  const handlePress = (entry: CalculatorEntry) => {
    if (entry.pro) {
      trackEvent('calibration_cta_click', {
        source:
          entry.key === 'GuidedCalibration'
            ? 'guided_calibration'
            : 'advanced_calibration',
      });
    }
    // Web 没有 IAP：展示统一功能预览，再导流到 Google Play。
    if (entry.pro && Platform.OS === 'web') {
      navigation.navigate('Paywall', { triggerSource: 'calc_home_guidedcalibration', intent: { kind: 'calibration' } });
      return;
    }
    if (entry.pro && access === 'locked') {
      navigation.navigate('Paywall', {
        triggerSource: `calc_home_${entry.key.toLowerCase()}`, intent: { kind: 'calibration' },
      });
      return;
    }
    if (entry.key === 'Offset') {
      navigation.navigate('Offset');
    } else if (entry.key === 'Stub') {
      navigation.navigate('Stub');
    } else if (entry.key === 'ThreePointSaddle') {
      navigation.navigate('ThreePointSaddle');
    } else if (entry.key === 'FourPointSaddle') {
      navigation.navigate('FourPointSaddle');
    } else if (entry.key === 'RollingOffset') {
      navigation.navigate('RollingOffset');
    } else if (entry.key === 'Kicked90') {
      navigation.navigate('Kicked90');
    } else if (entry.key === 'ConduitFill') {
      navigation.navigate('ConduitFill');
    } else if (entry.key === 'VoltageDrop') {
      navigation.navigate('VoltageDrop');
    } else if (entry.key === 'WireSize') {
      navigation.navigate('WireSize');
    } else if (entry.key === 'GuidedCalibration') {
      navigation.navigate('GuidedCalibration');
    } else if (entry.key === 'Calibration') {
      navigation.navigate('Calibration');
    } else {
      navigation.navigate('Placeholder', { title: entry.name });
    }
  };

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[
          styles.content,
          { padding: theme.spacing.md, gap: theme.spacing.md },
        ]}
      >
      {(pendingPurchase || phase === 'purchasing' || (access === 'unlocked' && pendingTask)) ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>
            {access === 'unlocked' ? 'Pro is ready — continue your task' : 'Your purchase is not complete yet'}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
            {access === 'unlocked' ? 'Your saved inputs are kept. Open your next step when ready.' : 'Keep using the free calculators while Google Play confirms payment.'}
          </Text>
          <BigButton title={access === 'unlocked' ? 'Continue with Pro' : 'Check purchase status'} variant="secondary" onPress={() => navigation.navigate('Paywall', { triggerSource: 'pending_resume', intent: pendingTask?.intent ?? { kind: 'calibration' }, pendingTaskId: pendingTask?.id })} />
        </Card>
      ) : null}
      {recent ? (
        <Card onPress={() => {
          setUnit(recent.params.unit ?? 'fractional');
          navigation.navigate(HISTORY_CALCULATOR_SCREENS[recent.kind], { backfill: recent.params });
        }} accessibilityLabel={`Continue last calculation: ${recent.title}`} style={{ gap: theme.spacing.xs }}>
          <Text style={{ color: theme.colors.accentText, fontSize: theme.fontSize.secondary, fontWeight: theme.fontWeight.semibold }}>
            Continue last calculation
          </Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>
            {recent.title} · {recent.inputSummary}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary, fontVariant: ['tabular-nums'] }}>
            {recent.resultSummary}
          </Text>
        </Card>
      ) : null}
      <View style={styles.unitRow}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
          }}
        >
          Units
        </Text>
        <View style={[styles.unitToggle, { gap: theme.spacing.xs }]}>
          <BigButton
            title="Fraction"
            size="selection"
            selected={unit === 'fractional'}
            onPress={() => handleUnitChange('fractional')}
            style={styles.unitButton}
          />
          <BigButton
            title="Decimal"
            size="selection"
            selected={unit === 'decimal'}
            onPress={() => handleUnitChange('decimal')}
            style={styles.unitButton}
          />
          <BigButton
            title="Metric"
            size="selection"
            selected={unit === 'metric'}
            onPress={() => handleUnitChange('metric')}
            style={styles.unitButton}
          />
        </View>
      </View>

      {Platform.OS === 'web' ? (
        <BigButton
          title={quickOpen ? 'Hide quick calculator' : 'Open quick calculator'}
          variant="secondary"
          expanded={quickOpen}
          onPress={() => setQuickOpen((open) => !open)}
        />
      ) : null}

      {Platform.OS === 'web' && quickOpen ? (
        <WebQuickCalculator
          onOpenStub={() => navigation.navigate('Stub')}
          onOpenOffset={() => navigation.navigate('Offset')}
        />
      ) : null}

      {GROUPS.map((group) => (
        <View key={group.key} style={{ gap: theme.spacing.sm }}>
          {group.key === 'bender' ? <RatingCard source="home" /> : null}
          <Text accessibilityRole="header" style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary, fontWeight: theme.fontWeight.semibold }}>
            {group.title}
          </Text>
          {ENTRIES.filter((entry) => entry.group === group.key).map((entry) => (
            <Card
              key={entry.key}
              accessibilityRole="button"
              onPress={() => handlePress(entry)}
              style={styles.card}
            >
              <View
                style={[
                  styles.accentBar,
                  {
                    backgroundColor: theme.colors.accent,
                    marginRight: theme.spacing.sm,
                  },
                ]}
              />
              <Text
                numberOfLines={1}
                style={[styles.icon, { color: theme.colors.primaryText }]}
              >
                {entry.icon}
              </Text>
              <View style={styles.textBlock}>
                <View style={styles.nameRow}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: theme.fontSize.body,
                      fontWeight: theme.fontWeight.semibold,
                      letterSpacing: 0.1,
                    }}
                  >
                    {entry.name}
                  </Text>
                  {entry.pro && (access === 'locked' || Platform.OS === 'web') ? (
                    <Text
                      style={[
                        styles.proPill,
                        {
                          backgroundColor: theme.colors.accent,
                          color: theme.colors.onAccent,
                          marginLeft: theme.spacing.xs,
                        },
                      ]}
                    >
                      PRO
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: theme.fontSize.secondary,
                    marginTop: theme.spacing.xs,
                  }}
                >
                  {entry.description}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: theme.colors.accentText }]}>›</Text>
            </Card>
          ))}
        </View>
      ))}
      <FeedbackCard />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  proPill: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    height: 44,
    flexShrink: 0,
    borderRadius: 2,
  },
  icon: {
    fontSize: 26,
    width: 44,
    textAlign: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    paddingLeft: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  chevron: {
    fontSize: 24,
    marginLeft: 8,
  },
  unitRow: {
    gap: 8,
  },
  unitToggle: {
    flexDirection: 'row',
  },
  unitButton: {
    flex: 1,
  },
});
