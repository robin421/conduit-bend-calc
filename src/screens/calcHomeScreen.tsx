import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState, type ComponentType } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppState,
  InteractionManager,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';

import BigButton from '../components/bigButton';
import Card from '../components/card';
import LanguageSwitcher from '../components/languageSwitcher';
import RatingCard from '../components/ratingCard';
import FeedbackCard from '../components/feedbackCard';
import { useI18n, type TranslationKey } from '../i18n';
import {
  BenderDialIcon,
  ChevronRightIcon,
  ConduitFillIcon,
  FourPointSaddleIcon,
  Kicked90Icon,
  OffsetIcon,
  RollingOffsetIcon,
  StubIcon,
  ThreePointSaddleIcon,
  VoltageDropIcon,
  WireSizeIcon,
  type IconProps,
} from '../components/toolIcons';
import WebQuickCalculator from '../components/webQuickCalculator';
import {
  isWideDesktopViewport,
  workspaceMaxWidth,
} from '../seo/calculatorNav';
import { HISTORY_CALCULATOR_SCREENS } from '../lib/homeContent';
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
  Icon: ComponentType<IconProps>;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  group: 'bending' | 'electrical' | 'bender';
  /** Pro 功能：未购买时点击进付费墙（仅校准类，计算器不再 gate）。 */
  pro?: boolean;
}

const ENTRIES: CalculatorEntry[] = [
  { key: 'Offset', group: 'bending', Icon: OffsetIcon, nameKey: 'home.tool.offset.name', descriptionKey: 'home.tool.offset.desc' },
  { key: 'Stub', group: 'bending', Icon: StubIcon, nameKey: 'home.tool.stub.name', descriptionKey: 'home.tool.stub.desc' },
  { key: 'ThreePointSaddle', group: 'bending', Icon: ThreePointSaddleIcon, nameKey: 'home.tool.saddle3.name', descriptionKey: 'home.tool.saddle3.desc' },
  { key: 'FourPointSaddle', group: 'bending', Icon: FourPointSaddleIcon, nameKey: 'home.tool.saddle4.name', descriptionKey: 'home.tool.saddle4.desc' },
  { key: 'RollingOffset', group: 'bending', Icon: RollingOffsetIcon, nameKey: 'home.tool.rollingOffset.name', descriptionKey: 'home.tool.rollingOffset.desc' },
  { key: 'Kicked90', group: 'bending', Icon: Kicked90Icon, nameKey: 'home.tool.kicked90.name', descriptionKey: 'home.tool.kicked90.desc' },
  { key: 'ConduitFill', group: 'electrical', Icon: ConduitFillIcon, nameKey: 'home.tool.conduitFill.name', descriptionKey: 'home.tool.conduitFill.desc' },
  { key: 'VoltageDrop', group: 'electrical', Icon: VoltageDropIcon, nameKey: 'home.tool.voltageDrop.name', descriptionKey: 'home.tool.voltageDrop.desc' },
  { key: 'WireSize', group: 'electrical', Icon: WireSizeIcon, nameKey: 'home.tool.wireSize.name', descriptionKey: 'home.tool.wireSize.desc' },
  { key: 'GuidedCalibration', group: 'bender', Icon: BenderDialIcon, nameKey: 'home.tool.guidedCalibration.name', descriptionKey: 'home.tool.guidedCalibration.desc', pro: true },
];

const GROUPS: ReadonlyArray<{
  key: 'bending' | 'electrical' | 'bender';
  titleKey: TranslationKey;
}> = [
  { key: 'bending', titleKey: 'home.group.bending' },
  { key: 'electrical', titleKey: 'home.group.electrical' },
  { key: 'bender', titleKey: 'home.group.bender' },
];

export default function CalcHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const { unit, setUnit } = useUnitSystem();
  const { access, phase, pendingPurchase } = useProAccess();
  const [pendingTask, setPendingTask] = useState<PendingProTask | null>(null);
  const [recent, setRecent] = useState<HistoryEntry | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  const isWideWeb = Platform.OS === 'web' && isWideDesktopViewport(width);
  const containerMaxWidth = Platform.OS === 'web' ? workspaceMaxWidth(width) : 720;

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
      // Try-Before-Buy：Native/Web 均直达免费实测向导，仅在保存时后置门控。
      navigation.navigate('GuidedCalibration', { entrySource: 'calc_home_guidedcalibration' });
    } else if (entry.key === 'Calibration') {
      navigation.navigate('Calibration', { entrySource: 'calc_home_calibration' });
    } else {
      navigation.navigate('Placeholder', { title: t(entry.nameKey) });
    }
  };

  const mainColumn = (
    <View style={{ gap: theme.spacing.md, flex: isWideWeb ? 3 : undefined }}>
      {(pendingPurchase || phase === 'purchasing' || (access === 'unlocked' && pendingTask)) ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>
            {access === 'unlocked' ? t('home.proReadyTitle') : t('home.proPendingTitle')}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
            {access === 'unlocked' ? t('home.proReadyBody') : t('home.proPendingBody')}
          </Text>
          <BigButton title={access === 'unlocked' ? t('home.proContinueButton') : t('home.proCheckStatusButton')} variant="secondary" onPress={() => navigation.navigate('Paywall', { triggerSource: 'pending_resume', intent: pendingTask?.intent ?? { kind: 'calibration' }, pendingTaskId: pendingTask?.id })} />
        </Card>
      ) : null}
      {recent ? (
        <Card onPress={() => {
          setUnit(recent.params.unit ?? 'fractional');
          navigation.navigate(HISTORY_CALCULATOR_SCREENS[recent.kind], { backfill: recent.params });
        }} accessibilityLabel={t('home.continueLastA11y', { title: recent.title })} style={{ gap: theme.spacing.xs }}>
          <Text style={{ color: theme.colors.accentText, fontSize: theme.fontSize.secondary, fontWeight: theme.fontWeight.semibold }}>
            {t('home.continueLast')}
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
        <View style={styles.preferencesHeader}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
              fontWeight: theme.fontWeight.medium,
            }}
          >
            {t('common.units')}
          </Text>
          <LanguageSwitcher tone="surface" />
        </View>
        <View
          style={[
            styles.unitSegmentTrack,
            {
              backgroundColor: theme.scheme === 'dark' ? theme.colors.card : '#EAF0F6',
              borderColor: theme.colors.border,
              borderRadius: theme.radius,
            },
          ]}
        >
          {(
            [
              { key: 'fractional', labelKey: 'common.unit.fractional' },
              { key: 'decimal', labelKey: 'common.unit.decimal' },
              { key: 'metric', labelKey: 'common.unit.metric' },
            ] as const
          ).map((opt) => {
            const selected = unit === opt.key;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => handleUnitChange(opt.key)}
                style={(state) => {
                  const { focused } = state as { focused?: boolean };
                  return [
                    styles.unitSegmentItem,
                    selected
                      ? {
                          backgroundColor: theme.scheme === 'dark' ? theme.colors.primary : '#FFFFFF',
                          borderColor: theme.scheme === 'dark' ? theme.colors.accent : '#C8D4E0',
                        }
                      : {
                          backgroundColor: 'transparent',
                          borderColor: 'transparent',
                        },
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
                  numberOfLines={1}
                  style={{
                    color: selected ? theme.colors.textPrimary : theme.colors.textSecondary,
                    fontSize: 13,
                    fontWeight: selected ? theme.fontWeight.semibold : theme.fontWeight.medium,
                  }}
                >
                  {t(opt.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {Platform.OS === 'web' && !isWideWeb ? (
        <BigButton
          title={quickOpen ? t('home.quickCalcHide') : t('home.quickCalcOpen')}
          variant="secondary"
          expanded={quickOpen}
          onPress={() => setQuickOpen((open) => !open)}
        />
      ) : null}

      {Platform.OS === 'web' && !isWideWeb && quickOpen ? (
        <WebQuickCalculator
          onOpenStub={() => navigation.navigate('Stub')}
          onOpenOffset={() => navigation.navigate('Offset')}
        />
      ) : null}

      {GROUPS.map((group) => (
        <View key={group.key} style={{ gap: theme.spacing.sm }}>
          {group.key === 'bender' ? <RatingCard source="home" /> : null}
          <Text accessibilityRole="header" style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary, fontWeight: theme.fontWeight.semibold }}>
            {t(group.titleKey)}
          </Text>
          <View style={isWideWeb ? [styles.cardGrid, { gap: theme.spacing.sm }] : { gap: theme.spacing.sm }}>
            {ENTRIES.filter((entry) => entry.group === group.key).map((entry) => (
              <Card
                key={entry.key}
                accessibilityRole="button"
                onPress={() => handlePress(entry)}
                style={[styles.card, isWideWeb ? styles.cardGridItem : null]}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: theme.scheme === 'dark' ? theme.colors.background : '#EFF4F8',
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius,
                    },
                  ]}
                >
                  <entry.Icon size={20} color={theme.colors.primaryText} />
                </View>
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
                      {t(entry.nameKey)}
                    </Text>
                    {entry.pro && (access === 'locked' || Platform.OS === 'web') ? (
                      <Text
                        style={[
                          styles.proPill,
                          {
                            backgroundColor: theme.colors.selection,
                            color: theme.colors.accentText,
                            borderColor: theme.colors.accentText,
                            borderWidth: StyleSheet.hairlineWidth,
                            marginLeft: theme.spacing.xs,
                          },
                        ]}
                      >
                        {t('home.tool.guidedCalibration.freeTryBadge')}
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
                    {entry.pro && (access === 'locked' || Platform.OS === 'web')
                      ? t('home.tool.guidedCalibration.descTryFree')
                      : t(entry.descriptionKey)}
                  </Text>
                </View>
                <View style={styles.chevronWrap}>
                  <ChevronRightIcon size={18} color={theme.colors.textSecondary} />
                </View>
              </Card>
            ))}
          </View>
        </View>
      ))}
      <FeedbackCard />
    </View>
  );

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: containerMaxWidth,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: isWideWeb ? 24 : theme.spacing.md,
            gap: theme.spacing.md,
          },
        ]}
      >
        {isWideWeb ? (
          <View style={styles.wideColumns}>
            {mainColumn}
            <View style={styles.stickySidebar}>
              <WebQuickCalculator
                onOpenStub={() => navigation.navigate('Stub')}
                onOpenOffset={() => navigation.navigate('Offset')}
              />
            </View>
          </View>
        ) : (
          mainColumn
        )}
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
  wideColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },
  stickySidebar: {
    flex: 2,
    minWidth: 320,
    position: 'sticky' as unknown as ViewStyle['position'],
    top: 24,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  cardGridItem: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 260,
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
  iconBox: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  chevronWrap: {
    marginLeft: 8,
    flexShrink: 0,
  },
  unitRow: {
    gap: 6,
  },
  preferencesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  unitSegmentTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    padding: 3,
    borderWidth: 1,
  },
  unitSegmentItem: {
    flex: 1,
    height: '100%',
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
