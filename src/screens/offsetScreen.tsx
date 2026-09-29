import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { calculateOffset } from '../calculators/offset/offset';
import { offsetWarnings } from '../calculators/warnings/warnings';
import { resolveSpecKey, specKey } from '../calculators/geometry/benderSpecs';
import BenderRow from '../components/benderRow';
import BenderStatusBanner from '../components/benderStatusBanner';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import BendDiagram from '../components/bendDiagram';
import type { DiagramInput } from '../calculators/diagrams/diagrams.ts';
import ExpectedActualFeedback from '../components/expectedActualFeedback';
import FeasibilityPanel from '../components/feasibilityPanel';
import ImperialInput from '../components/imperialInput';
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import { OffsetAngle, OFFSET_ANGLES } from '../constants';
import { offsetFeasibility } from '../calculators/feasibility/feasibility';
import { useBenderSpec } from '../lib/benderSpecStore';
import { useBenderProfiles } from '../lib/benderProfileStore';
import { useProAccess } from '../lib/proStore';
import { applyCalibrationOffset } from '../lib/profile';
import { useCustomSpecs } from '../lib/customSpecs';
import { useHistoryAutoSave, createHistoryId } from '../lib/history';
import { useCalculatorAnalytics } from '../lib/analytics';
import { useScreenMemory } from '../lib/screenMemory';
import { useUnitSystem } from '../lib/unitStore';
import { formatLength, formatMeasurement } from '../lib/units';
import type { HistoryEntry } from '../lib/historyStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Offset'>;

const DEFAULT_ANGLE: OffsetAngle = 30;


export default function OffsetScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { unit } = useUnitSystem();
  const [memory, setMemory] = useScreenMemory('offset', {
    heightText: '',
    angle: DEFAULT_ANGLE,
  });
  const { heightText, angle } = memory;
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const { spec, setSpec } = useBenderSpec();
  const { specs: customSpecs } = useCustomSpecs();
  const { activeProfile } = useBenderProfiles();
  const { access } = useProAccess();

  const setHeightText = useCallback(
    (text: string) => setMemory((prev) => ({ ...prev, heightText: text })),
    [setMemory],
  );
  const setAngle = useCallback(
    (value: OffsetAngle) => setMemory((prev) => ({ ...prev, angle: value })),
    [setMemory],
  );

  const backfill = route.params?.backfill;

  useEffect(() => {
    if (!backfill) {
      return;
    }
    if (backfill.heightText !== undefined) {
      setHeightText(backfill.heightText);
    }
    if (backfill.angle !== undefined) {
      setAngle(backfill.angle);
    }
    if (backfill.specKey) {
      const resolved = resolveSpecKey(backfill.specKey, customSpecs);
      if (resolved) {
        setSpec(resolved);
      }
    }
  }, [backfill, customSpecs]);

  const result = useMemo(() => {
    if (heightInches === null) {
      return null;
    }
    return calculateOffset(heightInches, angle, spec.centerlineRadius);
  }, [angle, heightInches, spec]);

  const diagramInput = useMemo<DiagramInput | null>(() => {
    if (!result || heightInches === null) {
      return null;
    }
    return {
      kind: 'offset',
      unit,
      height: heightInches,
      thetaDeg: angle,
      spacingDisplay: result.distanceBetweenBends,
      shrinkDisplay: result.shrink,
    };
  }, [result, heightInches, angle, unit]);

  const warnings = useMemo(() => {
    if (!result) {
      return [];
    }
    return offsetWarnings(result.geometry.vertexSpacing, angle, spec);
  }, [angle, result, spec]);

  const feasibility = useMemo(() => {
    if (!result) {
      return null;
    }
    return offsetFeasibility(result.geometry.vertexSpacing, angle, spec, unit);
  }, [angle, result, spec, unit]);

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (!result || heightInches === null) {
      return null;
    }
    return {
      id: createHistoryId(),
      kind: 'offset',
      title: 'Offset Bend',
      inputSummary: `${heightText.trim()} · ${angle}°`,
      resultSummary: `Spacing ${formatLength(result.distanceBetweenBends, unit)} · shrink ${formatLength(result.shrink, unit)}`,
      timestamp: Date.now(),
      params: { heightText, angle, specKey: specKey(spec) },
      signature: `offset|${heightInches}|${angle}`,
    };
  }, [angle, heightInches, heightText, result, spec, unit]);

  useHistoryAutoSave(historyEntry);
  useCalculatorAnalytics('offset', historyEntry?.signature ?? null);

  const handleClear = useCallback(() => {
    setMemory({ heightText: '', angle: DEFAULT_ANGLE });
    setHeightInches(null);
  }, [setMemory]);

  const calibratedDistance = result
    ? applyCalibrationOffset(result.distanceBetweenBends, activeProfile)
    : null;
  const distance = calibratedDistance !== null ? formatMeasurement(calibratedDistance, unit) : undefined;
  const shrink = result ? formatMeasurement(result.shrink, unit) : undefined;

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
        <BenderRow spec={spec} onPress={() => navigation.navigate('Bender')} />
        <View style={{ marginTop: theme.spacing.sm }}>
          <ImperialInput
            label="Obstacle height"
            value={heightText}
            onChangeText={setHeightText}
            onParsedChange={setHeightInches}
            unit={unit}
            placeholder={unit === 'metric' ? 'e.g. 150 mm' : 'e.g. 6"'}
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

      {diagramInput ? (
        <Card style={{ padding: theme.spacing.sm }}>
          <BendDiagram input={diagramInput} />
        </Card>
      ) : null}

      <ResultGroup
        hero={{ label: 'Mark spacing', value: distance?.value, unit: distance?.unit }}
        rows={[{ label: 'Shrink', value: shrink?.value, unit: shrink?.unit }]}
        hint={!result ? 'Enter values to see results' : undefined}
      />

      <BenderStatusBanner
        profile={activeProfile}
        isPro={access === 'unlocked'}
        showCalibrateCta={result !== null}
        onCalibrate={() =>
          navigation.navigate(
            access === 'unlocked' ? 'GuidedCalibration' : 'Paywall',
          )
        }
      />

      <ExpectedActualFeedback
        profile={activeProfile}
        expectedInches={calibratedDistance}
        label="Mark spacing"
        unit={unit}
      />

      <FeasibilityPanel
        result={feasibility}
        isPro={access === 'unlocked'}
        unit={unit}
        onCheckFeasibility={() => navigation.navigate('Paywall')}
      />

      {result ? (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
          }}
        >
          Mark both points with the arrow
        </Text>
      ) : null}

      <WarningBar warnings={warnings} />

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
    height: 52,
    minHeight: 52,
  },
});
