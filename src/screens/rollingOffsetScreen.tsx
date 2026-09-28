import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { resolveSpecKey, specKey } from '../calculators/geometry/benderSpecs';
import { calculateRollingOffset } from '../calculators/rollingOffset/rollingOffset';
import { offsetWarnings } from '../calculators/warnings/warnings';
import BenderRow from '../components/benderRow';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import BendDiagram from '../components/bendDiagram';
import type { DiagramInput } from '../calculators/diagrams/diagrams.ts';
import ImperialInput from '../components/imperialInput';
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import { OffsetAngle, OFFSET_ANGLES } from '../constants';
import { useBenderSpec } from '../lib/benderSpecStore';
import { useCustomSpecs } from '../lib/customSpecs';
import { createHistoryId, useHistoryAutoSave } from '../lib/history';
import { useScreenMemory } from '../lib/screenMemory';
import type { HistoryEntry } from '../lib/historyStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'RollingOffset'>;

const DEFAULT_ANGLE: OffsetAngle = 30;

function formatInches(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatDeg(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function RollingOffsetScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const [memory, setMemory] = useScreenMemory('rollingOffset', {
    riseText: '',
    rollText: '',
    angle: DEFAULT_ANGLE,
  });
  const { riseText, rollText, angle } = memory;
  const [riseInches, setRiseInches] = useState<number | null>(null);
  const [rollInches, setRollInches] = useState<number | null>(null);
  const { spec, setSpec } = useBenderSpec();
  const { specs: customSpecs } = useCustomSpecs();

  const setRiseText = useCallback(
    (text: string) => setMemory((prev) => ({ ...prev, riseText: text })),
    [setMemory],
  );
  const setRollText = useCallback(
    (text: string) => setMemory((prev) => ({ ...prev, rollText: text })),
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
    if (backfill.riseText !== undefined) {
      setRiseText(backfill.riseText);
    }
    if (backfill.rollText !== undefined) {
      setRollText(backfill.rollText);
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
    if (riseInches === null || rollInches === null) {
      return null;
    }
    return calculateRollingOffset(
      riseInches,
      rollInches,
      angle,
      spec.centerlineRadius,
    );
  }, [angle, riseInches, rollInches, spec]);

  const diagramInput = useMemo<DiagramInput | null>(() => {
    if (!result || riseInches === null || rollInches === null) {
      return null;
    }
    return {
      kind: 'rolling',
      rise: riseInches,
      roll: rollInches,
      trueOffset: result.trueOffset,
      rollAngleDeg: result.rollAngleDeg,
      thetaDeg: angle,
      spacingDisplay: result.spacingDisplay,
      shrinkDisplay: result.shrinkDisplay,
    };
  }, [result, riseInches, rollInches, angle]);

  const warnings = useMemo(() => {
    if (!result) {
      return [];
    }
    return offsetWarnings(result.geometry.vertexSpacing, angle, spec);
  }, [angle, result, spec]);

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (!result || riseInches === null || rollInches === null) {
      return null;
    }
    return {
      id: createHistoryId(),
      kind: 'rollingOffset',
      title: 'Rolling Offset',
      inputSummary: `rise ${riseText.trim()} · roll ${rollText.trim()} · ${angle}°`,
      resultSummary: `Spacing ${formatInches(result.spacingDisplay)}" · rotation ${formatDeg(result.rollAngleDeg)}°`,
      timestamp: Date.now(),
      params: { riseText, rollText, angle, specKey: specKey(spec) },
      signature: `rollingOffset|${riseInches}|${rollInches}|${angle}|${specKey(spec)}`,
    };
  }, [angle, riseInches, riseText, result, rollInches, rollText, spec]);

  useHistoryAutoSave(historyEntry);

  const handleClear = useCallback(() => {
    setMemory({ riseText: '', rollText: '', angle: DEFAULT_ANGLE });
    setRiseInches(null);
    setRollInches(null);
  }, [setMemory]);

  const hint = result ? undefined : 'Enter values to see results';

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
            label="Rise"
            value={riseText}
            onChangeText={setRiseText}
            onParsedChange={setRiseInches}
            placeholder={`e.g. 6"`}
          />
          <View style={{ marginTop: theme.spacing.sm }}>
            <ImperialInput
              label="Roll"
              value={rollText}
              onChangeText={setRollText}
              onParsedChange={setRollInches}
              placeholder={`e.g. 8"`}
            />
          </View>
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
        hero={{
          label: 'Mark spacing',
          value: result ? formatInches(result.spacingDisplay) : undefined,
          unit: '"',
        }}
        rows={
          result
            ? [
                {
                  label: 'True offset',
                  value: formatInches(result.trueOffset),
                  unit: '"',
                },
                {
                  label: 'Bender rotation',
                  value: formatDeg(result.rollAngleDeg),
                  unit: '°',
                },
                {
                  label: 'Shrink',
                  value: formatInches(result.shrinkDisplay),
                  unit: '"',
                },
              ]
            : []
        }
        hint={hint}
      />

      <WarningBar warnings={warnings} />

      {result ? (
        <Card style={{ gap: theme.spacing.md }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            Mark layout
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
                  color: theme.colors.primary,
                  fontSize: theme.fontSize.body,
                  fontWeight: theme.fontWeight.semibold,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {mark.id === 1 ? 'Start' : `+${formatInches(mark.fromStartInches)}"`}
              </Text>
            </View>
          ))}
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            Rotate the bender to the rotation angle first, then mark the spacing
          </Text>
        </Card>
      ) : null}

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
  markRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
