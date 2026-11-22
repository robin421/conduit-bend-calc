import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { calculateThreePointSaddle } from '../calculators/saddle/saddle';
import {
  threePointSaddleWarnings,
} from '../calculators/warnings/warnings';
import { resolveSpecKey, specKey } from '../calculators/geometry/benderSpecs';
import BenderRow from '../components/benderRow';
import BenderStatusBanner from '../components/benderStatusBanner';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import ConduitTypeToggle from '../components/conduitTypeToggle';
import BendGuide from '../components/bendGuide';
import type { DiagramInput } from '../calculators/diagrams/diagrams.ts';
import ExpectedActualFeedback from '../components/expectedActualFeedback';
import FeasibilityPanel from '../components/feasibilityPanel';
import ImperialInput from '../components/imperialInput';
import QuickUnitToggle from '../components/quickUnitToggle';
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import WebCalcShell from '../components/webCalcShell';
import { OffsetAngle, OFFSET_ANGLES } from '../constants';
import { threePointSaddleFeasibility } from '../calculators/feasibility/feasibility';
import { useI18n } from '../i18n';
import { useBenderSpec } from '../lib/benderSpecStore';
import { useBenderProfiles } from '../lib/benderProfileStore';
import { useProAccess } from '../lib/proStore';
import {
  applyCalibrationOffset,
  findFirstSpecByConduitType,
  matchesConduitType,
} from '../lib/profile';
import type { ConduitType } from '../lib/profile';
import { useCustomSpecs } from '../lib/customSpecs';
import { createHistoryId, useHistoryAutoSave } from '../lib/history';
import { trackEvent, useCalculatorAnalytics } from '../lib/analytics';
import { useFirebaseCalculationCompleted } from '../lib/firebase';
import { useReviewOnSuccessfulCalc } from '../lib/inAppReview';
import { useScreenMemory } from '../lib/screenMemory';
import { useUnitSystem } from '../lib/unitStore';
import { formatLength, formatMeasurement, type UnitSystem } from '../lib/units';
import type { HistoryEntry } from '../lib/historyStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'ThreePointSaddle'>;

const DEFAULT_ANGLE: OffsetAngle = 45;

function formatFromCenter(value: number, unit: UnitSystem, centerLabel: string): string {
  if (value === 0) {
    return centerLabel;
  }
  const abs = formatLength(Math.abs(value), unit);
  return value < 0 ? `${centerLabel} −${abs}` : `${centerLabel} +${abs}`;
}

export default function ThreePointSaddleScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const focused = useIsFocused();
  const { unit } = useUnitSystem();
  const [memory, setMemory] = useScreenMemory('threePointSaddle', {
    heightText: '',
    angle: DEFAULT_ANGLE,
  });
  const { heightText, angle } = memory;
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const { spec, setSpec, loaded: specLoaded } = useBenderSpec();
  const { specs: customSpecs, ready: customSpecsReady } = useCustomSpecs();
  const { activeProfile } = useBenderProfiles();
  const { access } = useProAccess();

  /** 材质跟随已保存的弯管器，约束本屏规格选择。 */
  const [conduitType, setConduitType] = useState<ConduitType>(() => matchesConduitType(spec.conduit, 'Rigid') ? 'Rigid' : 'EMT');
  const materialInitialized = useRef(false);

  const setHeightText = useCallback(
    (text: string) => setMemory((prev) => ({ ...prev, heightText: text })),
    [setMemory],
  );
  const setAngle = useCallback(
    (value: OffsetAngle) => setMemory((prev) => ({ ...prev, angle: value })),
    [setMemory],
  );

  const backfill = route.params?.backfill;
  const appliedBackfill = useRef<typeof backfill>(undefined);

  // 材质与当前全局规格不一致时，自动切到该材质的第一个预设规格。
  useEffect(() => {
    if (!focused) {
      materialInitialized.current = false;
      return;
    }
    if (!specLoaded) return;
    if (!materialInitialized.current) {
      materialInitialized.current = true;
      setConduitType(matchesConduitType(spec.conduit, 'Rigid') ? 'Rigid' : 'EMT');
      return;
    }
    if (matchesConduitType(spec.conduit, conduitType)) {
      return;
    }
    const next = findFirstSpecByConduitType(conduitType);
    if (next) {
      setSpec(next);
    }
  }, [conduitType, spec, setSpec, specLoaded, focused]);

  const handleConduitTypeChange = useCallback((next: ConduitType) => {
    setConduitType(next);
  }, []);

  useEffect(() => {
    if (!focused || !backfill || !customSpecsReady || appliedBackfill.current === backfill) {
      return;
    }
    appliedBackfill.current = backfill;
    noteReviewInteraction.reset();
    if (backfill.heightText !== undefined) {
      setHeightText(backfill.heightText);
    }
    if (backfill.angle !== undefined) {
      setAngle(backfill.angle);
    }
    if (backfill.specKey) {
      const resolved = resolveSpecKey(backfill.specKey, customSpecs);
      if (resolved) {
        setConduitType(matchesConduitType(resolved.conduit, 'Rigid') ? 'Rigid' : 'EMT');
        setSpec(resolved);
      }
    }
  }, [backfill, customSpecs, customSpecsReady, focused]);

  const result = useMemo(() => {
    if (heightInches === null) {
      return null;
    }
    return calculateThreePointSaddle(
      heightInches,
      angle,
      spec.centerlineRadius,
    );
  }, [angle, heightInches, spec]);

  const diagramInput = useMemo<DiagramInput | null>(() => {
    if (!result || heightInches === null) {
      return null;
    }
    return {
      kind: 'saddle3',
      unit,
      height: heightInches,
      sideSpacingDisplay: result.markSpacingInches,
      thetaDeg: angle,
    };
  }, [result, heightInches, angle, unit]);

  const warnings = useMemo(() => {
    if (!result) {
      return [];
    }
    return threePointSaddleWarnings(result.markSpacingInches, angle, spec);
  }, [angle, result, spec]);

  const feasibility = useMemo(() => {
    if (!result) {
      return null;
    }
    return threePointSaddleFeasibility(result.markSpacingInches, angle, spec, unit);
  }, [angle, result, spec, unit]);

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (!result || heightInches === null) {
      return null;
    }
    return {
      id: createHistoryId(),
      kind: 'threePointSaddle',
      title: '3-Point Saddle',
      inputSummary: `${heightText.trim()} · ${angle}°`,
      resultSummary: `Spacing ${formatLength(result.markSpacingInches, unit)} · shrink ${formatLength(result.shrinkInches ?? 0, unit)} · span ${formatLength(result.spanInches, unit)}`,
      timestamp: Date.now(),
      params: { heightText, angle, specKey: specKey(spec), unit },
      signature: `three-point-saddle|${heightInches}|${angle}|${specKey(spec)}|${unit}`,
    };
  }, [angle, heightInches, heightText, result, spec, unit]);

  const unitSystem = unit === 'metric' ? 'metric' : 'imperial';
  const activeSignature = focused ? historyEntry?.signature ?? null : null;
  useHistoryAutoSave(historyEntry, 800, focused);
  const noteReviewInteraction = useReviewOnSuccessfulCalc(activeSignature, feasibility?.status);
  useCalculatorAnalytics('saddle3', activeSignature, { unitSystem });
  useFirebaseCalculationCompleted('saddle3', activeSignature, { unitSystem, unitMode: unit });

  const handleClear = useCallback(() => {
    setMemory({ heightText: '', angle: DEFAULT_ANGLE });
    setHeightInches(null);
  }, [setMemory]);

  const hint = result ? undefined : t('calc.enterValuesHint');

  const calibratedSpacing =
    result !== null ? applyCalibrationOffset(result.markSpacingInches, activeProfile) : null;
  const spacingMeasurement =
    calibratedSpacing !== null ? formatMeasurement(calibratedSpacing, unit) : undefined;
  const shrinkMeasurement =
    result && result.shrinkInches !== undefined
      ? formatMeasurement(result.shrinkInches, unit)
      : undefined;

  const leftColumn = (
    <Card style={{ padding: theme.spacing.sm }}>
      <QuickUnitToggle />
      <View style={{ marginTop: theme.spacing.xs }}>
        <BenderRow
          spec={spec}
          onPress={() =>
            navigation.navigate('Bender', { conduitTypeFilter: conduitType })
          }
        />
      </View>
      <View style={{ marginTop: theme.spacing.sm }}>
        <ConduitTypeToggle
          value={conduitType}
          onChange={(next) => { noteReviewInteraction(); handleConduitTypeChange(next); }}
        />
      </View>
      <View style={{ marginTop: theme.spacing.sm }}>
        <ImperialInput
          label={t('calc.obstacleHeight')}
          value={heightText}
          onChangeText={(text) => { noteReviewInteraction(); setHeightText(text); }}
          onParsedChange={setHeightInches}
          unit={unit}
          placeholder={unit === 'metric' ? t('placeholder.mm150') : t('placeholder.inch6')}
        />
      </View>

      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
          marginTop: theme.spacing.sm,
          marginBottom: theme.spacing.sm,
        }}
      >
        {t('calc.bendAngle')}
      </Text>
      <View style={styles.angleRow}>
        {OFFSET_ANGLES.map((value) => (
          <BigButton
            key={value}
            title={`${value}°`}
            variant="option"
            size="selection"
            selected={angle === value}
            onPress={() => { noteReviewInteraction(); setAngle(value); }}
            style={styles.angleButton}
          />
        ))}
      </View>
    </Card>
  );

  const rightColumn = (
    <>
      <ResultGroup
        hero={{
          label: t('saddle3.bendSpacing'),
          value: spacingMeasurement?.value,
          unit: spacingMeasurement?.unit,
        }}
        rows={[
          {
            label: t('saddle3.centerMarkShrink'),
            value: shrinkMeasurement?.value,
            unit: shrinkMeasurement?.unit,
          },
        ]}
        hint={hint}
      />

      <WarningBar warnings={warnings} />

      <FeasibilityPanel
        result={feasibility}
        isPro={access === 'unlocked'}
        unit={unit}
        onCheckFeasibility={() =>
          navigation.navigate('Paywall', { triggerSource: 'three_point_saddle_feasibility', intent: { kind: 'feasibility', screen: 'ThreePointSaddle' } })
        }
      />

      {diagramInput ? (
        <BendGuide input={diagramInput} />
      ) : null}

      {result ? (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
          }}
        >
          {t('saddle3.addToCenterMark')}
        </Text>
      ) : null}

      {result ? (
        <Card style={{ gap: theme.spacing.md }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            {t('calc.markLayoutSpan', { span: formatLength(result.spanInches, unit) })}
          </Text>
          {result.marks.map((mark) => (
            <View key={mark.id} style={styles.markRow}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.fontSize.body,
                  fontWeight: theme.fontWeight.semibold,
                }}
              >
                {mark.label}
              </Text>
              <Text
                style={{
                  color: theme.colors.primaryText,
                  fontSize: theme.fontSize.body,
                  fontWeight: theme.fontWeight.semibold,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatFromCenter(mark.fromCenterInches, unit, t('calc.center'))}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.secondary,
                  marginTop: theme.spacing.xs,
                }}
              >
                {mark.instruction}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <BenderStatusBanner
        profile={activeProfile}
        isPro={access === 'unlocked'}
        showCalibrateCta={result !== null}
        onCalibrate={() => {
          trackEvent('calibration_cta_click', { source: 'three_point_saddle_result' });
          if (access === 'unlocked') {
            navigation.navigate('GuidedCalibration');
          } else {
            navigation.navigate('Paywall', { triggerSource: 'three_point_saddle_calibration', intent: { kind: 'calibration' } });
          }
        }}
      />
      <ExpectedActualFeedback
        profile={activeProfile}
        expectedInches={calibratedSpacing}
        label={t('calc.bendSpacing')}
        unit={unit}
      />

      <BigButton title={t('common.clear')} variant="secondary" onPress={handleClear} />
    </>
  );

  return <WebCalcShell title={t('home.tool.saddle3.name')} left={leftColumn} right={rightColumn} />;
}

const styles = StyleSheet.create({
  angleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  angleButton: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 64,
  },
  markRow: {
    width: '100%',
  },
});
