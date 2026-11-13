import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { calculateFourPointSaddle } from '../calculators/saddle/saddle';
import {
  fourPointSaddleWarnings,
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
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import { OffsetAngle, OFFSET_ANGLES } from '../constants';
import { fourPointSaddleFeasibility } from '../calculators/feasibility/feasibility';
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

type Props = NativeStackScreenProps<CalcStackParamList, 'FourPointSaddle'>;

const DEFAULT_ANGLE: OffsetAngle = 30;

function formatFromCenter(value: number, unit: UnitSystem): string {
  if (value === 0) {
    return 'Center';
  }
  const abs = formatLength(Math.abs(value), unit);
  return value < 0 ? `Center −${abs}` : `Center +${abs}`;
}

export default function FourPointSaddleScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const focused = useIsFocused();
  const { unit } = useUnitSystem();
  const [memory, setMemory] = useScreenMemory('fourPointSaddle', {
    heightText: '',
    widthText: '',
    angle: DEFAULT_ANGLE,
  });
  const { heightText, widthText, angle } = memory;
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const [widthInches, setWidthInches] = useState<number | null>(null);
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
  const setWidthText = useCallback(
    (text: string) => setMemory((prev) => ({ ...prev, widthText: text })),
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
    if (backfill.heightText !== undefined) {
      setHeightText(backfill.heightText);
    }
    if (backfill.widthText !== undefined) {
      setWidthText(backfill.widthText);
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
    if (heightInches === null || widthInches === null) {
      return null;
    }
    return calculateFourPointSaddle(
      heightInches,
      widthInches,
      angle,
      spec.centerlineRadius,
    );
  }, [angle, heightInches, spec, widthInches]);

  const diagramInput = useMemo<DiagramInput | null>(() => {
    if (!result || heightInches === null || widthInches === null) {
      return null;
    }
    return {
      kind: 'saddle4',
      unit,
      height: heightInches,
      thetaDeg: angle,
      legSpacingDisplay: result.markSpacingInches,
      flatWidth: widthInches,
    };
  }, [result, heightInches, widthInches, angle, unit]);

  const warnings = useMemo(() => {
    if (!result || widthInches === null) {
      return [];
    }
    return fourPointSaddleWarnings(
      result.markSpacingInches,
      widthInches,
      angle,
      spec,
    );
  }, [angle, result, spec, widthInches]);

  const feasibility = useMemo(() => {
    if (!result || widthInches === null) {
      return null;
    }
    return fourPointSaddleFeasibility(
      result.markSpacingInches,
      widthInches,
      angle,
      spec,
      unit,
    );
  }, [angle, result, spec, unit, widthInches]);

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (!result || heightInches === null || widthInches === null) {
      return null;
    }
    return {
      id: createHistoryId(),
      kind: 'fourPointSaddle',
      title: '4-Point Saddle',
      inputSummary: `${heightText.trim()} · ${widthText.trim()} · ${angle}°`,
      resultSummary: `Spacing ${formatLength(result.markSpacingInches, unit)} · span ${formatLength(result.spanInches, unit)}`,
      timestamp: Date.now(),
      params: { heightText, widthText, angle, specKey: specKey(spec), unit },
      signature: `four-point-saddle|${heightInches}|${widthInches}|${angle}|${specKey(spec)}|${unit}`,
    };
  }, [angle, heightInches, heightText, result, spec, unit, widthInches, widthText]);

  const unitSystem = unit === 'metric' ? 'metric' : 'imperial';
  const activeSignature = focused ? historyEntry?.signature ?? null : null;
  useHistoryAutoSave(historyEntry, 800, focused);
  useReviewOnSuccessfulCalc(activeSignature, feasibility?.status);
  useCalculatorAnalytics('saddle4', activeSignature, { unitSystem });
  useFirebaseCalculationCompleted('saddle4', activeSignature, { unitSystem });

  const handleClear = useCallback(() => {
    setMemory({ heightText: '', widthText: '', angle: DEFAULT_ANGLE });
    setHeightInches(null);
    setWidthInches(null);
  }, [setMemory]);

  const hint = result ? undefined : 'Enter values to see results';

  const calibratedSpacing =
    result !== null ? applyCalibrationOffset(result.markSpacingInches, activeProfile) : null;
  const spacingMeasurement =
    calibratedSpacing !== null ? formatMeasurement(calibratedSpacing, unit) : undefined;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { padding: theme.spacing.sm, gap: theme.spacing.sm },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={{ padding: theme.spacing.sm }}>
        <BenderRow
          spec={spec}
          onPress={() =>
            navigation.navigate('Bender', { conduitTypeFilter: conduitType })
          }
        />
        <View style={{ marginTop: theme.spacing.sm }}>
          <ConduitTypeToggle
            value={conduitType}
            onChange={handleConduitTypeChange}
          />
        </View>
        <View style={{ marginTop: theme.spacing.sm }}>
          <ImperialInput
            label="Obstacle height"
            value={heightText}
            onChangeText={setHeightText}
            onParsedChange={setHeightInches}
            unit={unit}
            placeholder={unit === 'metric' ? 'e.g. 150 mm' : 'e.g. 6"'}
          />

          <ImperialInput
            label="Obstacle width"
            value={widthText}
            onChangeText={setWidthText}
            onParsedChange={setWidthInches}
            unit={unit}
            placeholder={unit === 'metric' ? 'e.g. 100 mm' : 'e.g. 4"'}
            style={{ marginTop: theme.spacing.sm }}
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
          Bend angle
        </Text>
        <View style={styles.angleRow}>
          {OFFSET_ANGLES.map((value) => (
            <BigButton
              key={value}
              title={`${value}°`}
              variant="option"
              size="selection"
              selected={angle === value}
              onPress={() => setAngle(value)}
              style={styles.angleButton}
            />
          ))}
        </View>
      </Card>

      <ResultGroup
        hero={{
          label: 'Bend spacing (edge ↔ bend)',
          value: spacingMeasurement?.value,
          unit: spacingMeasurement?.unit,
        }}
        hint={hint}
      />

      <WarningBar warnings={warnings} />

      <FeasibilityPanel
        result={feasibility}
        isPro={access === 'unlocked'}
        unit={unit}
        onCheckFeasibility={() =>
          navigation.navigate('Paywall', { triggerSource: 'four_point_saddle_feasibility' })
        }
      />

      {diagramInput ? (
        <BendGuide input={diagramInput} />
      ) : null}

      {result ? (
        <Card style={{ gap: theme.spacing.md }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            Mark layout · total span {formatLength(result.spanInches, unit)}
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
                {formatFromCenter(mark.fromCenterInches, unit)}
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
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
              marginTop: theme.spacing.sm,
            }}
          >
            Leave about {formatLength(2, unit)} past the inner marks so the conduit clears the
            obstacle.
          </Text>
          {result.totalShrinkInches !== undefined ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.secondary,
              }}
            >
              Measuring from a fixed point? Add {formatLength(result.totalShrinkInches, unit)}
              shrink to find the true center.
            </Text>
          ) : null}
        </Card>
      ) : null}

      <BenderStatusBanner
        profile={activeProfile}
        isPro={access === 'unlocked'}
        showCalibrateCta={result !== null}
        onCalibrate={() => {
          trackEvent('calibration_cta_click', { source: 'four_point_saddle_result' });
          if (access === 'unlocked') {
            navigation.navigate('GuidedCalibration');
          } else {
            navigation.navigate('Paywall', { triggerSource: 'four_point_saddle_calibration' });
          }
        }}
      />
      <ExpectedActualFeedback
        profile={activeProfile}
        expectedInches={calibratedSpacing}
        label="Bend spacing"
        unit={unit}
      />

      <BigButton title="Clear" variant="secondary" onPress={handleClear} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
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
