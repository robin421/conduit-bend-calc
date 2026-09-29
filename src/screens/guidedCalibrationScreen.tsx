import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import BigButton from '../components/bigButton';
import Card from '../components/card';
import ImperialInput from '../components/imperialInput';
import {
  FIRST_GUIDED_STEP,
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
import { displayProfileName } from '../lib/profile';
import { useUnitSystem } from '../lib/unitStore';
import { formatMeasurement, inchesToMm } from '../lib/units';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'GuidedCalibration'>;

const STEP_TITLES: Record<GuidedStep, string> = {
  1: 'Mark the conduit',
  2: 'Bend 90°',
  3: 'Measure the stub',
  4: 'Save your bender',
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

export default function GuidedCalibrationScreen({ navigation }: Props) {
  const theme = useTheme();
  const { unit } = useUnitSystem();
  const { activeProfile } = useBenderProfiles();
  const [step, setStep] = useState<GuidedStep>(FIRST_GUIDED_STEP);
  const [measuredText, setMeasuredText] = useState('');
  const [measuredInches, setMeasuredInches] = useState<number | null>(null);
  const [name, setName] = useState('');

  // 被校准的基准 = 当前选中的 bender（工程参数只进 profile，不上界面）。
  const base = activeProfile;
  const result = useMemo(
    () => computeGuidedCalibration(measuredInches, base),
    [base, measuredInches],
  );

  const progress = guidedStepProgress(step);
  const canAdvance = canAdvanceGuidedStep(step, measuredInches, base);
  const canSave = name.trim().length > 0 && result !== null;

  const goNext = useCallback(() => setStep((value) => nextGuidedStep(value)), []);
  const goPrev = useCallback(() => setStep((value) => prevGuidedStep(value)), []);

  // Android 返回键：非首步回到上一步，首步交回导航默认（退出向导）。
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > FIRST_GUIDED_STEP) {
        setStep((value) => prevGuidedStep(value));
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [step]);

  const handleSave = useCallback(() => {
    if (!canSave) {
      return;
    }
    const profile = buildGuidedProfile(base, name, result, Date.now());
    if (!profile) {
      return;
    }
    upsertProfile(profile);
    setActiveProfile(profile.id);
    navigation.goBack();
  }, [base, canSave, name, navigation, result]);

  const stubMeasurement =
    measuredInches !== null ? formatMeasurement(measuredInches, unit) : undefined;
  const deductMeasurement = result ? formatMeasurement(result.actualDeduct, unit) : undefined;
  const markLabel =
    unit === 'metric'
      ? `${TEST_BEND_MARK}" (${Math.round(inchesToMm(TEST_BEND_MARK))} mm)`
      : `${TEST_BEND_MARK}"`;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md }}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {`Step ${progress.current} of ${progress.total} · ${STEP_TITLES[step]}`}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: 2,
          }}
        >
          {`Calibrating: ${displayProfileName(base)}`}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { padding: theme.spacing.md, gap: theme.spacing.md },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 ? (
          <Card style={{ gap: theme.spacing.md }}>
            <StepHeading>{`Mark ${markLabel} from the end`}</StepHeading>
            <BodyText>
              Measure from the end of the conduit and make one clear mark. This is the only
              measurement you need before bending.
            </BodyText>
            <DiagramBox>{`End ─────●───── ${markLabel} mark`}</DiagramBox>
            <BigButton
              title="Advanced calibration"
              variant="secondary"
              onPress={() => navigation.navigate('Calibration')}
            />
          </Card>
        ) : null}

        {step === 2 ? (
          <Card style={{ gap: theme.spacing.md }}>
            <StepHeading>Bend a 90° stub</StepHeading>
            <BodyText>
              Line the bender arrow up with your mark, then bend a full 90° stub. Keep the
              conduit seated in the bender.
            </BodyText>
            <DiagramBox>{'Arrow ▼\nEnd ─────●───── mark\n           90°'}</DiagramBox>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card style={{ gap: theme.spacing.md }}>
            <StepHeading>Enter the finished stub height</StepHeading>
            <BodyText>
              Measure from the end of the conduit to the back of the bend. Type the finished
              height S below.
            </BodyText>
            <ImperialInput
              label="Finished stub height (S)"
              value={measuredText}
              onChangeText={setMeasuredText}
              onParsedChange={setMeasuredInches}
              unit={unit}
              keyboardType="numeric"
              placeholder={unit === 'metric' ? 'e.g. 440 mm' : `e.g. 17 3/8"`}
            />
            <ValueRow label="Finished height (S)" value={stubMeasurement ? `${stubMeasurement.value} ${stubMeasurement.unit}` : undefined} />
            <ValueRow
              label={'Deduct (S − 12")'}
              value={deductMeasurement ? `${deductMeasurement.value} ${deductMeasurement.unit}` : undefined}
            />
          </Card>
        ) : null}

        {step === 4 ? (
          <Card style={{ gap: theme.spacing.md }}>
            <StepHeading>Calibrated ✓</StepHeading>
            <BodyText>
              This bender is now matched to your one test bend. Give it a name you will
              recognize on the job.
            </BodyText>
            <ValueRow
              label="Deduct"
              value={deductMeasurement ? `${deductMeasurement.value} ${deductMeasurement.unit}` : undefined}
            />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={namePlaceholder(base)}
              placeholderTextColor={theme.colors.textSecondary}
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
                },
              ]}
            />
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
        {step === FIRST_GUIDED_STEP ? (
          <BigButton title="Next" onPress={goNext} />
        ) : step < 4 ? (
          <View style={styles.footerRow}>
            <BigButton title="Back" variant="secondary" onPress={goPrev} style={styles.footerButton} />
            <BigButton
              title="Next"
              onPress={goNext}
              disabled={!canAdvance}
              style={styles.footerButton}
            />
          </View>
        ) : (
          <View style={styles.footerRow}>
            <BigButton title="Back" variant="secondary" onPress={goPrev} style={styles.footerButton} />
            <BigButton
              title="Save"
              onPress={handleSave}
              disabled={!canSave}
              style={styles.footerButton}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function namePlaceholder(base: { conduitSize: string; conduitType: string }): string {
  const label = `${base.conduitSize} ${base.conduitType}`.trim();
  return label ? `e.g. My ${label}` : 'e.g. My bender';
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
