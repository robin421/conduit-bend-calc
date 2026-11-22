import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import BigButton from '../components/bigButton';
import Card from '../components/card';
import ImperialInput from '../components/imperialInput';
import WebCalcShell, { WebBreadcrumbBar } from '../components/webCalcShell';
import { useI18n, type TranslationKey } from '../i18n';
import { isWideDesktopViewport } from '../seo/calculatorNav';
import {
  FIRST_GUIDED_STEP,
  MEASURE_STEP,
  TEST_BEND_MARK,
  buildGuidedProfile,
  canAdvanceGuidedStep,
  computeGuidedCalibration,
  guidedStepProgress,
  nextGuidedStep,
  prevGuidedStep,
  type GuidedStep,
} from '../lib/guidedCalibrationFlow';
import {
  setActiveProfile,
  upsertProfile,
  useBenderProfiles,
} from '../lib/benderProfileStore';
import {
  clearPendingCalibrationDraft,
  computeTakeUpComparison,
  deltaBucket,
  formatSignedDelta,
  savePendingCalibrationDraft,
} from '../lib/pendingCalibrationDraftStore';
import { normalizeProSource } from '../lib/proFlow';
import { useProAccess } from '../lib/proStore';
import { displayProfileName } from '../lib/profile';
import { trackGrowthEvent } from '../lib/growth';
import { useUnitSystem } from '../lib/unitStore';
import { formatLength, formatMeasurement, type UnitSystem } from '../lib/units';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'GuidedCalibration'>;

/** Full Fingerprint 路径默认废料长度（英寸），与 Calibration 屏预填值一致。 */
const FULL_FINGERPRINT_SCRAP_LENGTH = 24;

const STEP_TITLE_KEYS: Record<GuidedStep, TranslationKey> = {
  1: 'calibration.guided.stepTitle1',
  2: 'calibration.guided.stepTitle2',
  3: 'calibration.guided.stepTitle3',
  4: 'calibration.guided.stepTitle4',
};

function StepHeading({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.title,
        fontWeight: theme.fontWeight.semibold,
        lineHeight: 30,
      }}
    >
      {children}
    </Text>
  );
}

function BodyText({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.body,
        lineHeight: 22,
      }}
    >
      {children}
    </Text>
  );
}

function DiagramBox({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.diagram,
        { borderColor: theme.colors.border, borderRadius: theme.radius },
      ]}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.fontSize.body,
          fontVariant: ['tabular-nums'],
        }}
      >
        {children}
      </Text>
    </View>
  );
}

function ValueRow({ label, value }: { label: string; value: string | undefined }) {
  const theme = useTheme();
  return (
    <View style={styles.valueRow}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.fontSize.body,
          fontWeight: theme.fontWeight.semibold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value ?? '—'}
      </Text>
    </View>
  );
}

function DiagnosisComparisonBlock({
  baseTakeUp,
  measuredTakeUp,
  unit,
}: {
  baseTakeUp: number;
  measuredTakeUp: number;
  unit: UnitSystem;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const comparison = computeTakeUpComparison(baseTakeUp, measuredTakeUp, TEST_BEND_MARK);
  if (!comparison) {
    return null;
  }

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius,
        backgroundColor: theme.colors.background,
        padding: 12,
        gap: theme.spacing.sm,
      }}
    >
      <View style={styles.diagnosisHeader}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.secondary,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          {t('calibration.guided.diagnosisTitle')}
        </Text>
        <View
          style={{
            backgroundColor: theme.colors.accent,
            paddingHorizontal: 8,
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
            {formatSignedDelta(comparison.deltaInches, unit)}
          </Text>
        </View>
      </View>

      <View style={styles.comparePairRow}>
        <View
          style={[
            styles.compareBox,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderRadius: theme.radius,
            },
          ]}
        >
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16 }}>
            {t('calibration.guided.standardTakeUp')}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: 20,
              lineHeight: 24,
              fontWeight: theme.fontWeight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatLength(baseTakeUp, unit)}
          </Text>
        </View>
        <View
          style={[
            styles.compareBox,
            {
              backgroundColor: theme.colors.resultBackground,
              borderColor: theme.colors.accent,
              borderWidth: 1.5,
              borderRadius: theme.radius,
            },
          ]}
        >
          <Text style={{ color: theme.colors.resultLabel, fontSize: 12, lineHeight: 16 }}>
            {t('calibration.guided.measuredTakeUp')}
          </Text>
          <Text
            style={{
              color: theme.colors.accent,
              fontSize: 20,
              lineHeight: 24,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatLength(measuredTakeUp, unit)}
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: theme.colors.resultBackground,
          borderRadius: theme.radius,
          padding: 10,
          gap: 4,
        }}
      >
        <Text style={{ color: theme.colors.resultLabel, fontSize: 12, lineHeight: 16 }}>
          {t('calibration.guided.markCompareLabel', {
            target: formatLength(comparison.targetStub, unit),
          })}
        </Text>
        <Text
          style={{
            color: theme.colors.resultText,
            fontSize: 20,
            lineHeight: 24,
            fontWeight: theme.fontWeight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {`${formatLength(comparison.standardMark, unit)} → ${formatLength(comparison.personalMark, unit)}`}
        </Text>
      </View>
    </View>
  );
}

function SkipToMeasureLink({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: theme.colors.pressFeedback }}
      style={({ pressed }) => [
        styles.skipButton,
        {
          borderColor: theme.colors.border,
          borderRadius: theme.radius,
          backgroundColor:
            pressed && Platform.OS !== 'android' ? theme.colors.pressFeedback : 'transparent',
        },
      ]}
    >
      <Text
        style={{
          color: theme.colors.accentText,
          fontSize: theme.fontSize.secondary,
          fontWeight: theme.fontWeight.semibold,
        }}
      >
        {t('calibration.guided.skipToMeasure')}
      </Text>
    </Pressable>
  );
}

function PathCard({
  badge,
  title,
  body,
  buttonTitle,
  onPress,
}: {
  badge?: string;
  title: string;
  body: string;
  buttonTitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <View style={styles.pathTitleRow}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.title,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          {title}
        </Text>
        {badge ? (
          <Text
            style={[
              styles.badge,
              {
                color: theme.colors.success,
                borderColor: theme.colors.success,
                borderRadius: theme.radius,
              },
            ]}
          >
            {badge}
          </Text>
        ) : null}
      </View>
      <BodyText>{body}</BodyText>
      <BigButton title={buttonTitle} onPress={onPress} />
    </Card>
  );
}

/** 双路径入口：Quick Check（默认推荐）与 Full Fingerprint。 */
function DialInChooser({
  navigation,
  entrySource,
  onStartQuick,
}: {
  navigation: Props['navigation'];
  entrySource?: string;
  onStartQuick: () => void;
}) {
  const { t } = useI18n();
  const { unit } = useUnitSystem();
  const { access } = useProAccess();
  const unlocked = Platform.OS !== 'web' && access === 'unlocked';

  return (
    <WebCalcShell
      title={t('home.tool.guidedCalibration.name')}
      spacing="md"
      singleColumnMaxWidth={960}
    >
      <BodyText>
        {unlocked ? t('calibration.chooser.introUnlocked') : t('calibration.chooser.intro')}
      </BodyText>
      <PathCard
        badge={t('calibration.chooser.quickBadge')}
        title={t('calibration.chooser.quickTitle')}
        body={t('calibration.chooser.quickBody', {
          mark: formatLength(TEST_BEND_MARK, unit),
        })}
        buttonTitle={t('calibration.chooser.quickCta')}
        onPress={onStartQuick}
      />
      <PathCard
        title={t('calibration.chooser.fullTitle')}
        body={t('calibration.chooser.fullBody', {
          length: formatLength(FULL_FINGERPRINT_SCRAP_LENGTH, unit),
        })}
        buttonTitle={t('calibration.chooser.fullCta')}
        onPress={() =>
          navigation.navigate('Calibration', {
            entrySource: entrySource ?? 'full_fingerprint_save',
          })
        }
      />
    </WebCalcShell>
  );
}

/** Quick Check 向导：沿用 stub take-up 校准流程（一次测量修正 take-up）。 */
function QuickCheckWizard({
  navigation,
  rawEntrySource,
  onExitQuick,
}: {
  navigation: Props['navigation'];
  rawEntrySource?: string;
  onExitQuick: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const wideWeb = Platform.OS === 'web' && isWideDesktopViewport(width);
  const { unit } = useUnitSystem();
  const { access } = useProAccess();
  const { activeProfile } = useBenderProfiles();
  const [step, setStep] = useState<GuidedStep>(FIRST_GUIDED_STEP);
  const [measuredText, setMeasuredText] = useState('');
  const [measuredInches, setMeasuredInches] = useState<number | null>(null);
  const [name, setName] = useState('');
  const nameTouchedRef = useRef(false);
  const startedRef = useRef(false);
  const previewedRef = useRef(false);

  const normalizedEntrySource = normalizeProSource(
    rawEntrySource ?? 'guided_calibration_save',
  );

  // 被校准的基准 = 当前选中的 bender（工程参数只进 profile，不上界面）。
  const base = activeProfile;
  const baseTakeUp = base.nominalDeduct ?? base.takeUp;
  const result = useMemo(
    () => computeGuidedCalibration(measuredInches, base),
    [base, measuredInches],
  );
  const deltaInches = result ? result.actualDeduct - baseTakeUp : null;

  const suggestedName = useMemo(() => {
    const label = `${base.conduitSize} ${base.conduitType}`.trim();
    return label
      ? t('calibration.guided.defaultName', { label })
      : t('calibration.guided.defaultNameFallback');
  }, [base.conduitSize, base.conduitType, t]);

  const namePlaceholder = useMemo(() => {
    const label = `${base.conduitSize} ${base.conduitType}`.trim();
    return label
      ? t('calibration.guided.namePlaceholder', { label })
      : t('calibration.guided.namePlaceholderFallback');
  }, [base.conduitSize, base.conduitType, t]);

  // 进入 Quick Check 上报一次 calibration_try_started（无 PII）。
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackGrowthEvent('calibration_try_started', {
      source: normalizedEntrySource,
      mode: 'quick',
    });
  }, [normalizedEntrySource]);

  // Step 3 首次得出有效实测偏差时单次去重上报 calibration_result_previewed（仅离散分桶）。
  useEffect(() => {
    if (step !== MEASURE_STEP || deltaInches === null || previewedRef.current) {
      return;
    }
    previewedRef.current = true;
    trackGrowthEvent('calibration_result_previewed', {
      source: normalizedEntrySource,
      mode: 'quick',
      delta_bucket: deltaBucket(deltaInches),
    });
  }, [deltaInches, normalizedEntrySource, step]);

  // 进入 Step 4 自动预填建议名称（用户可自由修改）。
  useEffect(() => {
    if (step === 4 && !nameTouchedRef.current && name.trim() === '') {
      setName(suggestedName);
    }
  }, [name, step, suggestedName]);

  const progress = guidedStepProgress(step);
  const canAdvance = canAdvanceGuidedStep(step, measuredInches, base);
  const canSave = name.trim().length > 0 && result !== null;

  const goNext = useCallback(() => setStep((value) => nextGuidedStep(value)), []);
  const goPrev = useCallback(() => setStep((value) => prevGuidedStep(value)), []);
  const jumpToMeasure = useCallback(() => setStep(MEASURE_STEP), []);

  // Android 返回键：向导内逐级退回，首步回到双路径入口。
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > FIRST_GUIDED_STEP) {
        setStep((value) => prevGuidedStep(value));
      } else {
        onExitQuick();
      }
      return true;
    });
    return () => subscription.remove();
  }, [step, onExitQuick]);

  const handleNameChange = useCallback((value: string) => {
    nameTouchedRef.current = true;
    setName(value);
  }, []);

  const handleSave = useCallback(() => {
    if (!canSave || !result) {
      return;
    }
    const now = Date.now();
    const profile = buildGuidedProfile(base, name, result, now);
    if (!profile) {
      return;
    }
    if (Platform.OS !== 'web' && access === 'unlocked') {
      upsertProfile(profile);
      setActiveProfile(profile.id);
      trackGrowthEvent('bender_calibrated', { source: 'guided' });
      void clearPendingCalibrationDraft();
      navigation.goBack();
      return;
    }
    void savePendingCalibrationDraft({
      mode: 'guided',
      baseTakeUp,
      measuredTakeUp: result.actualDeduct,
      deltaInches: result.actualDeduct - baseTakeUp,
      profileName: profile.name,
      profile,
      entrySource: normalizedEntrySource,
      createdAt: now,
    }).finally(() => {
      trackGrowthEvent('calibration_save_gated', {
        source: normalizedEntrySource,
        mode: 'quick',
      });
      navigation.navigate('Paywall', {
        triggerSource: rawEntrySource ?? 'guided_calibration_save',
        intent: { kind: 'calibration' },
      });
    });
  }, [
    access,
    base,
    baseTakeUp,
    canSave,
    name,
    navigation,
    normalizedEntrySource,
    rawEntrySource,
    result,
  ]);

  const stubMeasurement =
    measuredInches !== null ? formatMeasurement(measuredInches, unit) : undefined;
  const deductMeasurement = result ? formatMeasurement(result.actualDeduct, unit) : undefined;
  const markLabel = formatLength(TEST_BEND_MARK, unit);
  const datumLabel =
    base.datum === 'hook' ? t('stub.datumHook') : t('stub.datumArrow');

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <WebBreadcrumbBar title={t('home.tool.guidedCalibration.name')} />
      <View
        style={{
          paddingHorizontal: wideWeb ? 24 : theme.spacing.md,
          paddingTop: theme.spacing.md,
          width: '100%',
          maxWidth: wideWeb ? 960 : 720,
          alignSelf: 'center',
        }}
      >
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {t('calibration.guided.progress', {
            current: progress.current,
            total: progress.total,
            title: t(STEP_TITLE_KEYS[step]),
          })}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: 2,
          }}
        >
          {t('calibration.guided.calibrating', { name: displayProfileName(base) })}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: wideWeb ? 960 : 720,
            padding: wideWeb ? 24 : theme.spacing.md,
            gap: theme.spacing.md,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 ? (
          <Card style={{ gap: theme.spacing.md }}>
            <StepHeading>
              {t('calibration.guided.step1Heading', { mark: markLabel })}
            </StepHeading>
            <BodyText>{t('calibration.guided.step1Body')}</BodyText>
            <DiagramBox>
              {t('calibration.guided.step1Diagram', { mark: markLabel })}
            </DiagramBox>
            <SkipToMeasureLink onPress={jumpToMeasure} />
          </Card>
        ) : null}

        {step === 2 ? (
          <Card style={{ gap: theme.spacing.md }}>
            <StepHeading>{t('calibration.guided.step2Heading')}</StepHeading>
            <BodyText>
              {t('calibration.guided.step2Body', { datum: datumLabel })}
            </BodyText>
            <DiagramBox>
              {t('calibration.guided.step2Diagram', { datum: datumLabel })}
            </DiagramBox>
            <SkipToMeasureLink onPress={jumpToMeasure} />
          </Card>
        ) : null}

        {step === 3 ? (
          <Card style={{ gap: theme.spacing.md }}>
            <StepHeading>{t('calibration.guided.step3Heading')}</StepHeading>
            <BodyText>{t('calibration.guided.step3Body')}</BodyText>
            <ImperialInput
              label={t('calibration.guided.stubInputLabel')}
              value={measuredText}
              onChangeText={setMeasuredText}
              onParsedChange={setMeasuredInches}
              unit={unit}
              keyboardType="numeric"
              placeholder={
                unit === 'metric'
                  ? t('calibration.guided.stubPlaceholderMetric')
                  : t('calibration.guided.stubPlaceholderImperial')
              }
            />
            <ValueRow
              label={t('calibration.guided.finishedHeightRow')}
              value={
                stubMeasurement
                  ? `${stubMeasurement.value}${stubMeasurement.unit ? ` ${stubMeasurement.unit}` : ''}`
                  : undefined
              }
            />
            <ValueRow
              label={t('calibration.guided.deductRow', { mark: markLabel })}
              value={
                deductMeasurement
                  ? `${deductMeasurement.value}${deductMeasurement.unit ? ` ${deductMeasurement.unit}` : ''}`
                  : undefined
              }
            />
            {result ? (
              <DiagnosisComparisonBlock
                baseTakeUp={baseTakeUp}
                measuredTakeUp={result.actualDeduct}
                unit={unit}
              />
            ) : null}
          </Card>
        ) : null}

        {step === 4 ? (
          <Card style={{ gap: theme.spacing.md }}>
            <StepHeading>{t('calibration.guided.step4Heading')}</StepHeading>
            <BodyText>{t('calibration.guided.step4Body')}</BodyText>
            {result ? (
              <DiagnosisComparisonBlock
                baseTakeUp={baseTakeUp}
                measuredTakeUp={result.actualDeduct}
                unit={unit}
              />
            ) : null}
            <View style={{ gap: theme.spacing.xs }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.secondary,
                  fontWeight: theme.fontWeight.medium,
                }}
              >
                {t('calibration.guided.nameLabel')}
              </Text>
              <TextInput
                value={name}
                onChangeText={handleNameChange}
                placeholder={namePlaceholder}
                placeholderTextColor={theme.colors.textSecondary}
                selectionColor={theme.colors.selection}
                cursorColor={theme.colors.accentText}
                autoCapitalize="words"
                autoCorrect={false}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius,
                    color: theme.colors.textPrimary,
                    fontSize: theme.fontSize.body,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: Platform.OS === 'android' ? 8 : 12,
                  },
                ]}
              />
            </View>
          </Card>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        {step < 4 ? (
          <View style={styles.footerRow}>
            <BigButton
              title={t('calibration.guided.back')}
              variant="secondary"
              onPress={step === FIRST_GUIDED_STEP ? onExitQuick : goPrev}
              style={styles.footerButton}
            />
            <BigButton
              title={t('calibration.guided.next')}
              onPress={goNext}
              disabled={!canAdvance}
              style={styles.footerButton}
            />
          </View>
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            <BigButton
              title={t('calibration.guided.saveAndApply')}
              variant="accent"
              onPress={handleSave}
              disabled={!canSave}
            />
            <BigButton
              title={t('calibration.guided.back')}
              variant="secondary"
              onPress={goPrev}
            />
          </View>
        )}
      </View>
    </View>
  );
}

export default function GuidedCalibrationScreen({ route, navigation }: Props) {
  const [mode, setMode] = useState<'choose' | 'quick'>('choose');
  const startQuick = useCallback(() => setMode('quick'), []);
  const exitQuick = useCallback(() => setMode('choose'), []);
  if (mode === 'quick') {
    return (
      <QuickCheckWizard
        navigation={navigation}
        rawEntrySource={route.params?.entrySource}
        onExitQuick={exitQuick}
      />
    );
  }
  return (
    <DialInChooser
      navigation={navigation}
      entrySource={route.params?.entrySource}
      onStartQuick={startQuick}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  diagram: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagnosisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  comparePairRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compareBox: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  skipButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  pathTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  input: {
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  footerButton: {
    flex: 1,
  },
});
