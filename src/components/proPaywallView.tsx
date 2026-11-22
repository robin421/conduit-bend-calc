import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { defaultBenderSpec } from '../calculators/geometry/benderSpecs';
import { calculateStubUpMark } from '../calculators/geometry/geometry';
import { offsetFeasibility } from '../calculators/feasibility/feasibility';
import { calculateOffset } from '../calculators/offset/offset';
import { useI18n, type TranslationKey } from '../i18n';
import { HISTORY_LIMIT } from '../lib/historyStore';
import { TEST_BEND_MARK } from '../lib/guidedCalibrationFlow';
import {
  computeTakeUpComparison,
  formatSignedDelta,
  type PendingCalibrationDraft,
} from '../lib/pendingCalibrationDraftStore';
import { formatLength, MM_PER_INCH, type UnitSystem } from '../lib/units';
import { PRO_SCENES, purchaseBusy, type ProIntent, type ProScene, type PurchasePhase } from '../lib/proFlow';
import { useTheme } from '../theme';
import BigButton from './bigButton';
import Card from './card';

export interface ProPaywallViewProps {
  scene: ProScene;
  intent: ProIntent;
  phase: PurchasePhase;
  unlocked: boolean;
  price: string | null;
  available: boolean;
  isWeb?: boolean;
  error?: string | null;
  continuing?: boolean;
  checking?: boolean;
  bottomInset?: number;
  unit?: UnitSystem;
  calibrationDraft?: PendingCalibrationDraft | null;
  totalHistoryCount?: number;
  onSceneChange(scene: ProScene): void;
  onDemoDeltaSelect?(): void;
  onTryFreeCalibration?(): void;
  onBuy(): void;
  onRestore(): void;
  onRetry(): void;
  onContinue(): void;
  onClose(): void;
}

const FAQ_KEYS: ReadonlyArray<readonly [TranslationKey, TranslationKey]> = [
  ['paywall.faq1.q', 'paywall.faq1.a'],
  ['paywall.faq2.q', 'paywall.faq2.a'],
  ['paywall.faq3.q', 'paywall.faq3.a'],
  ['paywall.faq4.q', 'paywall.faq4.a'],
];

const SCENE_TITLE_KEYS: Record<ProScene, TranslationKey> = {
  calibration: 'paywall.scene.calibration.title',
  feasibility: 'paywall.scene.feasibility.title',
  history: 'paywall.scene.history.title',
};

const SCENE_TAB_KEYS: Record<ProScene, TranslationKey> = {
  calibration: 'paywall.sceneTab.calibration',
  feasibility: 'paywall.sceneTab.feasibility',
  history: 'paywall.sceneTab.history',
};

const CONTINUE_KEYS: Record<ProIntent['kind'], TranslationKey> = {
  calibration: 'paywall.continue.calibration',
  feasibility: 'paywall.continue.feasibility',
  history: 'paywall.continue.history',
  export: 'paywall.continue.export',
  bender: 'paywall.continue.bender',
};

const IMPERIAL_DEMO_DELTAS = [
  { label: '+1/8"', deltaInches: 0.125 },
  { label: '+1/4"', deltaInches: 0.25 },
  { label: '+3/8"', deltaInches: 0.375 },
] as const;

const METRIC_DEMO_DELTAS = [
  { label: '+3 mm', deltaInches: 3 / MM_PER_INCH },
  { label: '+6 mm', deltaInches: 6 / MM_PER_INCH },
  { label: '+10 mm', deltaInches: 10 / MM_PER_INCH },
] as const;

function Caption({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary, lineHeight: 20 }}>{children}</Text>;
}

function ComparisonPair({
  beforeLabel,
  beforeValue,
  afterLabel,
  afterValue,
}: {
  beforeLabel: string;
  beforeValue: string;
  afterLabel: string;
  afterValue: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      <View
        style={{
          flex: 1,
          minWidth: 120,
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius,
          padding: 10,
          gap: 4,
        }}
      >
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16 }}>{beforeLabel}</Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: 22,
            lineHeight: 26,
            fontWeight: theme.fontWeight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {beforeValue}
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 120,
          backgroundColor: theme.colors.resultBackground,
          borderWidth: 1.5,
          borderColor: theme.colors.accent,
          borderRadius: theme.radius,
          padding: 10,
          gap: 4,
        }}
      >
        <Text style={{ color: theme.colors.resultLabel, fontSize: 12, lineHeight: 16 }}>{afterLabel}</Text>
        <Text
          style={{
            color: theme.colors.accent,
            fontSize: 22,
            lineHeight: 26,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
          }}
        >
          {afterValue}
        </Text>
      </View>
    </View>
  );
}

function HeroComparisonCard({
  scene,
  unit,
  calibrationDraft,
  totalHistoryCount,
  onSceneChange,
  onDemoDeltaSelect,
  onTryFreeCalibration,
}: {
  scene: ProScene;
  unit: UnitSystem;
  calibrationDraft?: PendingCalibrationDraft | null;
  totalHistoryCount: number;
  onSceneChange(scene: ProScene): void;
  onDemoDeltaSelect?(): void;
  onTryFreeCalibration?(): void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [demoDeltaIndex, setDemoDeltaIndex] = useState(2);
  const base = defaultBenderSpec();

  const demoChips = unit === 'metric' ? METRIC_DEMO_DELTAS : IMPERIAL_DEMO_DELTAS;
  const selectedDemoChip = demoChips[demoDeltaIndex] ?? demoChips[2];

  const hasPersonalDraft = Boolean(calibrationDraft);
  const effectiveBaseTakeUp = calibrationDraft ? calibrationDraft.baseTakeUp : base.takeUp;
  const effectiveMeasuredTakeUp = calibrationDraft
    ? calibrationDraft.measuredTakeUp
    : base.takeUp + selectedDemoChip.deltaInches;
  const demoMeasuredStub = TEST_BEND_MARK + effectiveMeasuredTakeUp;
  const comparison = computeTakeUpComparison(
    effectiveBaseTakeUp,
    effectiveMeasuredTakeUp,
    TEST_BEND_MARK,
  );
  const standardMark =
    comparison?.standardMark ?? calculateStubUpMark(TEST_BEND_MARK, base)!;
  const personalMark =
    comparison?.personalMark ??
    calculateStubUpMark(TEST_BEND_MARK, { ...base, takeUp: effectiveMeasuredTakeUp }) ??
    standardMark;
  const deltaBadgeText = calibrationDraft
    ? formatSignedDelta(calibrationDraft.deltaInches, unit)
    : selectedDemoChip.label;

  const sampleOffset = calculateOffset(3, 45, base.centerlineRadius)!;
  const risk = offsetFeasibility(sampleOffset.geometry.vertexSpacing, 45, base, unit);
  const hiddenHistoryCount = Math.max(0, totalHistoryCount - 5);

  return (
    <Card style={{ padding: 12, gap: 12, borderColor: theme.colors.border }}>
      <View
        style={{
          backgroundColor: theme.colors.background,
          padding: 3,
          borderRadius: theme.radius,
          borderWidth: 1,
          borderColor: theme.colors.border,
          flexDirection: 'row',
        }}
      >
        {PRO_SCENES.map((item) => {
          const selected = item.key === scene;
          const tabLabel = t(SCENE_TAB_KEYS[item.key]);
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t('paywall.sceneTabA11y', { label: tabLabel })}
              onPress={() => onSceneChange(item.key)}
              android_ripple={{ color: theme.colors.pressFeedback }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
                borderRadius: theme.radius - 2,
                overflow: 'hidden',
                backgroundColor: selected
                  ? theme.colors.accent
                  : pressed && Platform.OS !== 'android'
                    ? theme.colors.pressFeedback
                    : 'transparent',
              })}
            >
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 13,
                  lineHeight: 16,
                  textAlign: 'center',
                  fontWeight: selected ? theme.fontWeight.semibold : theme.fontWeight.medium,
                  color: selected ? theme.colors.onAccent : theme.colors.textSecondary,
                }}
              >
                {tabLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {scene === 'calibration' ? (
        <>
          {hasPersonalDraft && calibrationDraft ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
              {t('paywall.personalCalibrationIntro', { name: calibrationDraft.profileName })}
            </Text>
          ) : (
            <View style={{ gap: 6 }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                {t('paywall.exampleCalibrationIntro', {
                  mark: formatLength(TEST_BEND_MARK, unit),
                  measured: formatLength(demoMeasuredStub, unit),
                })}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: theme.fontWeight.medium,
                }}
              >
                {t('paywall.demoDeltaLabel')}
              </Text>
              <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
                {demoChips.map((chip, index) => {
                  const active = index === demoDeltaIndex;
                  return (
                    <Pressable
                      key={chip.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        setDemoDeltaIndex(index);
                        onDemoDeltaSelect?.();
                      }}
                      android_ripple={{ color: theme.colors.pressFeedback }}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderRadius: theme.radius,
                        borderColor: active ? theme.colors.accent : theme.colors.border,
                        backgroundColor: active
                          ? theme.colors.accent
                          : pressed && Platform.OS !== 'android'
                            ? theme.colors.pressFeedback
                            : theme.colors.background,
                        overflow: 'hidden',
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: active ? theme.fontWeight.semibold : theme.fontWeight.medium,
                          color: active ? theme.colors.onAccent : theme.colors.textPrimary,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
          <ComparisonPair
            beforeLabel={t('paywall.exampleStandardTakeUp')}
            beforeValue={formatLength(effectiveBaseTakeUp, unit)}
            afterLabel={t('paywall.exampleMeasuredTakeUp')}
            afterValue={formatLength(effectiveMeasuredTakeUp, unit)}
          />
          <View
            style={{
              backgroundColor: theme.colors.resultBackground,
              padding: 10,
              borderRadius: theme.radius,
              gap: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.xs }}>
              <Text style={{ flex: 1, color: theme.colors.resultLabel, fontSize: 13, lineHeight: 18 }}>
                {t('paywall.exampleMarkLabel')}
              </Text>
              <View
                style={{
                  backgroundColor: theme.colors.accent,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.onAccent,
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: theme.fontWeight.semibold,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {deltaBadgeText}
                </Text>
              </View>
            </View>
            <Text
              style={{
                color: theme.colors.resultText,
                fontSize: 20,
                lineHeight: 24,
                fontWeight: theme.fontWeight.semibold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {`${formatLength(standardMark, unit)} → ${formatLength(personalMark, unit)}`}
            </Text>
          </View>
          {hasPersonalDraft ? (
            <Text
              style={{
                color: theme.colors.accentText,
                fontSize: 12,
                lineHeight: 16,
                fontWeight: theme.fontWeight.semibold,
              }}
            >
              {t('paywall.personalCalibrationNote')}
            </Text>
          ) : (
            <>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16 }}>
                {t('paywall.exampleCalibrationNote')}
              </Text>
              {onTryFreeCalibration ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onTryFreeCalibration}
                  android_ripple={{ color: theme.colors.pressFeedback }}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: theme.radius,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.colors.border,
                    backgroundColor:
                      pressed && Platform.OS !== 'android'
                        ? theme.colors.pressFeedback
                        : theme.colors.background,
                    paddingHorizontal: 12,
                    overflow: 'hidden',
                  })}
                >
                  <Text
                    style={{
                      color: theme.colors.accentText,
                      fontSize: theme.fontSize.secondary,
                      fontWeight: theme.fontWeight.semibold,
                    }}
                  >
                    {t('paywall.tryFreeCalibrationCta')}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </>
      ) : scene === 'feasibility' ? (
        <>
          <View style={{ gap: 4 }}>
            <Text
              style={{
                color: theme.colors.accentText,
                fontSize: theme.fontSize.secondary,
                lineHeight: 19,
                fontWeight: theme.fontWeight.semibold,
              }}
            >
              {t('paywall.exampleFeasibilityTitle')}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
              {risk.messages[0] ?? t('paywall.exampleFeasibilityFallback')}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: theme.colors.resultBackground,
              padding: 10,
              borderRadius: theme.radius,
              gap: 4,
            }}
          >
            <Text style={{ color: theme.colors.resultLabel, fontSize: 12, lineHeight: 16, fontWeight: theme.fontWeight.semibold }}>
              {t('paywall.exampleFeasibilityNext')}
            </Text>
            {risk.suggestions.map((suggestion) => (
              <Text
                key={suggestion}
                style={{
                  color: theme.colors.resultText,
                  fontSize: theme.fontSize.secondary,
                  lineHeight: 20,
                }}
              >
                {suggestion}
              </Text>
            ))}
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16 }}>
            {t('paywall.exampleFeasibilityNote')}
          </Text>
        </>
      ) : (
        <>
          {hiddenHistoryCount > 0 ? (
            <View
              style={{
                backgroundColor: theme.colors.selection,
                borderColor: theme.colors.accentText,
                borderWidth: 1,
                borderRadius: theme.radius,
                padding: 10,
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: theme.colors.accentText,
                  fontSize: theme.fontSize.secondary,
                  lineHeight: 19,
                  fontWeight: theme.fontWeight.semibold,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {t('paywall.historyHiddenTitle', {
                  total: totalHistoryCount,
                  hidden: hiddenHistoryCount,
                })}
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: 13,
                  lineHeight: 18,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {t('paywall.historyHiddenNote', {
                  total: totalHistoryCount,
                  hidden: hiddenHistoryCount,
                  limit: HISTORY_LIMIT,
                })}
              </Text>
            </View>
          ) : null}
          <ComparisonPair
            beforeLabel={t('paywall.exampleFreeLabel')}
            beforeValue="5"
            afterLabel={t('paywall.exampleProLabel')}
            afterValue={String(HISTORY_LIMIT)}
          />
          <View
            style={{
              backgroundColor: theme.colors.resultBackground,
              padding: 10,
              borderRadius: theme.radius,
              gap: 4,
            }}
          >
            <Text style={{ color: theme.colors.resultLabel, fontSize: 12, lineHeight: 16, fontWeight: theme.fontWeight.semibold }}>
              {t('paywall.exampleExportTitle')}
            </Text>
            <Text
              style={{
                color: theme.colors.resultText,
                fontSize: theme.fontSize.secondary,
                lineHeight: 20,
                fontVariant: ['tabular-nums'],
              }}
            >
              {t('paywall.exampleExportSample', {
                height: formatLength(6, unit),
                spacing: formatLength(12, unit),
                shrink: formatLength(1.5, unit),
              })}
            </Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16 }}>
            {t('paywall.exampleHistoryNote', { limit: HISTORY_LIMIT })}
          </Text>
        </>
      )}
    </Card>
  );
}

function TextAction({ title, onPress, disabled = false }: { title: string; onPress(): void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: theme.colors.pressFeedback }}
      style={({ pressed }) => ({
        minHeight: 44,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radius,
        overflow: 'hidden',
        opacity: disabled ? 0.4 : 1,
        backgroundColor: pressed && Platform.OS !== 'android' ? theme.colors.pressFeedback : 'transparent',
      })}
    >
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
          fontWeight: theme.fontWeight.medium,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/** 只负责展示：沿用购买状态和显式继续任务，不写授权或调用商店。 */
export default function ProPaywallView(props: ProPaywallViewProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { height, fontScale } = useWindowDimensions();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const unit = props.unit ?? 'fractional';
  const totalHistoryCount = props.totalHistoryCount ?? 0;
  const hiddenHistoryCount = Math.max(0, totalHistoryCount - 5);
  const calibrationDraft = props.calibrationDraft ?? null;

  const busy = purchaseBusy(props.phase);
  const disabled = busy || Boolean(props.continuing);
  const waiting = props.phase === 'pending' || props.phase === 'purchasing';
  const loading = props.phase === 'loading' || props.phase === 'restoring';
  // 横屏、小高度或放大字体时，让操作区随整页滚动，避免固定区域吞掉内容。
  const footerInScroll = height < 640 || fontScale > 1.2;
  const showRestore = !props.isWeb && !props.unlocked && !waiting;
  const statusText = props.phase === 'pending' ? t('paywall.statusPending')
    : props.phase === 'purchasing' ? t('paywall.statusPurchasing')
    : props.phase === 'restoring' ? t('paywall.statusRestoring')
    : props.phase === 'loading' ? t('paywall.statusLoading') : null;
  const benefits: ReadonlyArray<readonly [string, string]> = [
    [t('paywall.benefit1.title'), t('paywall.benefit1.desc')],
    [t('paywall.benefit2.title'), t('paywall.benefit2.desc')],
    [t('paywall.benefit3.title'), t('paywall.benefit3.desc', { limit: HISTORY_LIMIT })],
  ];

  const headerTitle = props.unlocked
    ? props.phase === 'restored'
      ? t('paywall.unlockedRestoredTitle')
      : t('paywall.unlockedReadyTitle')
    : props.scene === 'calibration' && calibrationDraft
      ? t('paywall.personalCalibrationTitle', {
          delta: formatSignedDelta(calibrationDraft.deltaInches, unit),
        })
      : props.scene === 'history' && hiddenHistoryCount > 0
        ? t('paywall.historyHiddenTitle', {
            total: totalHistoryCount,
            hidden: hiddenHistoryCount,
          })
        : t(SCENE_TITLE_KEYS[props.scene]);

  const unlockedContinueTitle =
    props.intent.kind === 'calibration' && calibrationDraft
      ? t('paywall.continue.saveAndApplyDraft', { name: calibrationDraft.profileName })
      : t(CONTINUE_KEYS[props.intent.kind]);

  const footer = (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.card,
        paddingHorizontal: theme.spacing.md,
        paddingTop: 10,
        paddingBottom: Math.max(props.bottomInset ?? 0, 10),
        gap: theme.spacing.sm,
      }}
    >
      {statusText && !props.unlocked ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
          {props.phase !== 'pending' ? <ActivityIndicator color={theme.colors.accentText} /> : null}
          <View style={{ flex: 1 }}>
            <Caption>{statusText}</Caption>
          </View>
        </View>
      ) : null}
      {props.error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: props.phase === 'cancelled' ? theme.colors.textSecondary : theme.colors.error,
            fontSize: theme.fontSize.secondary,
            lineHeight: 20,
          }}
        >
          {props.error}
        </Text>
      ) : null}
      {!props.unlocked ? (
        <Text
          style={{
            color: theme.colors.accentText,
            fontSize: 13,
            lineHeight: 18,
            fontWeight: theme.fontWeight.medium,
          }}
        >
          {t('paywall.roiAnchor')}
        </Text>
      ) : null}
      {props.unlocked ? (
        <BigButton
          title={props.continuing ? t('paywall.openingTask') : unlockedContinueTitle}
          onPress={props.onContinue}
          disabled={Boolean(props.continuing)}
          variant="accent"
        />
      ) : props.isWeb ? (
        <>
          <Caption>{t('paywall.webCaption')}</Caption>
          <BigButton title={t('paywall.getAndroidApp')} variant="accent" onPress={props.onBuy} />
        </>
      ) : waiting ? (
        <BigButton
          title={props.checking ? t('paywall.checkingPurchase') : t('paywall.checkPurchaseStatus')}
          variant="secondary"
          disabled={props.checking}
          onPress={props.onRetry}
        />
      ) : loading ? (
        <BigButton
          title={props.phase === 'restoring' ? t('paywall.restoringPurchase') : t('paywall.loadingPrice')}
          variant="accent"
          disabled
          onPress={props.onBuy}
        />
      ) : props.available && props.price ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.title,
                fontWeight: theme.fontWeight.semibold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {props.price}
            </Text>
            <View
              style={{
                backgroundColor: theme.colors.selection,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: theme.radius,
              }}
            >
              <Text
                style={{
                  color: theme.colors.accentText,
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: theme.fontWeight.semibold,
                }}
              >
                {t('paywall.oneTimeNote')}
              </Text>
            </View>
          </View>
          <BigButton title={t('paywall.unlockCta')} variant="accent" onPress={props.onBuy} disabled={disabled} />
        </>
      ) : (
        <>
          <Caption>{t('paywall.storeUnavailableCaption')}</Caption>
          <BigButton title={t('paywall.retryStore')} variant="secondary" onPress={props.onRetry} disabled={disabled} />
        </>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        {showRestore ? (
          <>
            <TextAction title={t('paywall.restorePurchase')} onPress={props.onRestore} disabled={disabled} />
            <View
              style={{
                backgroundColor: theme.colors.border,
                width: StyleSheet.hairlineWidth,
                height: 18,
                alignSelf: 'center',
              }}
            />
          </>
        ) : null}
        <TextAction
          title={
            props.unlocked
              ? t('paywall.backToCalculators')
              : waiting
                ? t('paywall.continueWithFree')
                : t('paywall.notNow')
          }
          onPress={props.onClose}
          disabled={Boolean(props.continuing)}
        />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View
          style={[
            styles.content,
            {
              paddingHorizontal: theme.spacing.md,
              paddingTop: 12,
              paddingBottom: theme.spacing.md,
              gap: theme.spacing.md,
            },
            props.unlocked && !footerInScroll ? { flexGrow: 1, justifyContent: 'center' } : null,
          ]}
        >
          <View>
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.radius,
                backgroundColor: theme.colors.selection,
                borderWidth: 1,
                borderColor: theme.colors.accentText,
              }}
            >
              <Text
                style={{
                  color: theme.colors.accentText,
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: theme.fontWeight.semibold,
                  letterSpacing: 0.6,
                }}
              >
                {t('paywall.eyebrow')}
              </Text>
            </View>
            <Text
              accessibilityRole="header"
              style={{
                marginTop: 6,
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.title,
                lineHeight: 28,
                fontWeight: theme.fontWeight.semibold,
                fontVariant: ['tabular-nums'],
              }}
            >
              {headerTitle}
            </Text>
            <Text
              style={{
                marginTop: theme.spacing.xs,
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.secondary,
                lineHeight: 19,
              }}
            >
              {props.unlocked ? t('paywall.unlockedSubtitle') : t('paywall.defaultSubtitle')}
            </Text>
          </View>

          {props.unlocked ? (
            <View
              style={{
                gap: theme.spacing.sm,
                paddingVertical: theme.spacing.md,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text accessible={false} importantForAccessibility="no-hide-descendants" style={{ color: theme.colors.success, fontSize: theme.fontSize.title }}>
                  ✓
                </Text>
                <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>
                  {t('paywall.readyOnDevice')}
                </Text>
              </View>
              <Caption>
                {props.intent.kind === 'calibration' && calibrationDraft
                  ? t('paywall.readyDraftNote', { name: calibrationDraft.profileName })
                  : props.intent.kind === 'calibration' || props.intent.kind === 'bender'
                    ? t('paywall.readyCalibrationNote')
                    : t('paywall.readyDefaultNote')}
              </Caption>
            </View>
          ) : (
            <>
              <HeroComparisonCard
                scene={props.scene}
                unit={unit}
                calibrationDraft={calibrationDraft}
                totalHistoryCount={totalHistoryCount}
                onSceneChange={props.onSceneChange}
                onDemoDeltaSelect={props.onDemoDeltaSelect}
                onTryFreeCalibration={props.onTryFreeCalibration}
              />

              <View style={{ gap: 10 }}>
                {benefits.map(([title, description]) => (
                  <View key={title} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
                    <Text
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                      style={{ color: theme.colors.accentText, fontSize: theme.fontSize.body, lineHeight: 20 }}
                    >
                      ✓
                    </Text>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          color: theme.colors.textPrimary,
                          fontSize: theme.fontSize.secondary,
                          lineHeight: 19,
                          fontWeight: theme.fontWeight.semibold,
                        }}
                      >
                        {title}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                        {description}
                      </Text>
                    </View>
                  </View>
                ))}
                <View
                  style={{
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.colors.border,
                    paddingTop: theme.spacing.sm,
                  }}
                >
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                    {t('paywall.freePromise')}
                  </Text>
                </View>
              </View>

              <View>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: theme.fontSize.body,
                    lineHeight: 22,
                    fontWeight: theme.fontWeight.semibold,
                  }}
                >
                  {t('paywall.faqHeading')}
                </Text>
                {FAQ_KEYS.map(([questionKey, answerKey], index) => {
                  const isOpen = openFaq === index;
                  return (
                    <View key={questionKey}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isOpen }}
                        onPress={() => setOpenFaq(isOpen ? null : index)}
                        android_ripple={{ color: theme.colors.pressFeedback }}
                        style={{
                          minHeight: 48,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: theme.spacing.sm,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.colors.border,
                          paddingVertical: theme.spacing.sm,
                        }}
                      >
                        <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: theme.fontSize.secondary, lineHeight: 19 }}>
                          {t(questionKey)}
                        </Text>
                        <Text
                          accessible={false}
                          importantForAccessibility="no-hide-descendants"
                          style={{
                            color: theme.colors.accentText,
                            fontSize: theme.fontSize.body,
                            fontWeight: theme.fontWeight.semibold,
                          }}
                        >
                          {isOpen ? '−' : '+'}
                        </Text>
                      </Pressable>
                      {isOpen ? (
                        <View style={{ paddingVertical: theme.spacing.sm }}>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
                            {t(answerKey)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
        {footerInScroll ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
      {!footerInScroll ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  footer: { width: '100%', maxWidth: 600, alignSelf: 'center' },
});
