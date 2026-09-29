import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { resolveSpecKey, specKey } from '../calculators/geometry/benderSpecs';
import { calculateKicked90 } from '../calculators/kicked90/kicked90';
import { kicked90Warnings } from '../calculators/warnings/warnings';
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
import { kicked90Feasibility } from '../calculators/feasibility/feasibility';
import { useBenderSpec } from '../lib/benderSpecStore';
import { useBenderProfiles } from '../lib/benderProfileStore';
import { useProAccess } from '../lib/proStore';
import { applyCalibrationOffset } from '../lib/profile';
import { useCustomSpecs } from '../lib/customSpecs';
import { createHistoryId, useHistoryAutoSave } from '../lib/history';
import { useScreenMemory } from '../lib/screenMemory';
import { useUnitSystem } from '../lib/unitStore';
import { formatMeasurement } from '../lib/units';
import type { HistoryEntry } from '../lib/historyStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Kicked90'>;

function formatInches(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** 解析 kick 角：0 < κ < 90 的数字，非法返回 null。 */
function parseKickAngle(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0 || value >= 90) {
    return null;
  }
  return value;
}

export default function Kicked90Screen({ route, navigation }: Props) {
  const theme = useTheme();
  const { unit } = useUnitSystem();
  const [memory, setMemory] = useScreenMemory('kicked90', {
    kickText: '',
    lengthText: '',
  });
  const { kickText, lengthText } = memory;
  const [lengthInches, setLengthInches] = useState<number | null>(null);
  const { spec, setSpec } = useBenderSpec();
  const { specs: customSpecs } = useCustomSpecs();
  const { activeProfile } = useBenderProfiles();
  const { access } = useProAccess();

  const setKickText = useCallback(
    (text: string) => setMemory((prev) => ({ ...prev, kickText: text })),
    [setMemory],
  );
  const setLengthText = useCallback(
    (text: string) => setMemory((prev) => ({ ...prev, lengthText: text })),
    [setMemory],
  );

  const backfill = route.params?.backfill;

  useEffect(() => {
    if (!backfill) {
      return;
    }
    if (backfill.kickText !== undefined) {
      setKickText(backfill.kickText);
    }
    if (backfill.lengthText !== undefined) {
      setLengthText(backfill.lengthText);
    }
    if (backfill.specKey) {
      const resolved = resolveSpecKey(backfill.specKey, customSpecs);
      if (resolved) {
        setSpec(resolved);
      }
    }
  }, [backfill, customSpecs]);

  const kickAngle = useMemo(() => parseKickAngle(kickText), [kickText]);

  const result = useMemo(() => {
    if (kickAngle === null || lengthInches === null) {
      return null;
    }
    return calculateKicked90(kickAngle, lengthInches, spec.centerlineRadius);
  }, [kickAngle, lengthInches, spec]);

  const diagramInput = useMemo<DiagramInput | null>(() => {
    if (!result) {
      return null;
    }
    return {
      kind: 'kicked90',
      unit,
      kickAngleDeg: result.kickAngleDeg,
      straightLength: result.straightLength,
      totalGain: result.totalGain,
    };
  }, [result, unit]);

  const warnings = useMemo(() => {
    if (kickAngle === null || lengthInches === null) {
      return [];
    }
    return kicked90Warnings(kickAngle, lengthInches, spec);
  }, [kickAngle, lengthInches, spec]);

  const feasibility = useMemo(() => {
    if (kickAngle === null || lengthInches === null) {
      return null;
    }
    return kicked90Feasibility(kickAngle, lengthInches, spec);
  }, [kickAngle, lengthInches, spec]);

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (!result || kickAngle === null || lengthInches === null) {
      return null;
    }
    return {
      id: createHistoryId(),
      kind: 'kicked90',
      title: 'Kicked 90°',
      inputSummary: `kick ${kickText.trim()}° · straight ${lengthText.trim()}`,
      resultSummary: `Total gain ${formatInches(result.totalGain)}"`,
      timestamp: Date.now(),
      params: { kickText, lengthText, specKey: specKey(spec) },
      signature: `kicked90|${kickAngle}|${lengthInches}|${specKey(spec)}`,
    };
  }, [kickAngle, kickText, lengthInches, lengthText, result, spec]);

  useHistoryAutoSave(historyEntry);

  const handleClear = useCallback(() => {
    setMemory({ kickText: '', lengthText: '' });
    setLengthInches(null);
  }, [setMemory]);

  const kickInvalid = kickText.trim() !== '' && kickAngle === null;

  let hint: string | undefined;
  if (kickAngle === null || lengthInches === null) {
    hint = kickInvalid ? 'Kick angle must be a number between 0–90' : 'Enter values to see results';
  }

  const calibratedGain =
    result !== null ? applyCalibrationOffset(result.totalGain, activeProfile) : null;
  const gainMeasurement =
    calibratedGain !== null ? formatMeasurement(calibratedGain, unit) : undefined;

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
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
              marginBottom: theme.spacing.xs,
            }}
          >
            Kick angle κ (degrees, typically 10–30)
          </Text>
          <TextInput
            value={kickText}
            onChangeText={setKickText}
            placeholder="e.g. 15"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background,
                borderColor: kickInvalid
                  ? theme.colors.error
                  : theme.colors.border,
                borderRadius: theme.radius,
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.title,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
          />
          <View style={{ marginTop: theme.spacing.sm }}>
            <ImperialInput
              label="Straight L between bends (tangent to tangent)"
              value={lengthText}
              onChangeText={setLengthText}
              onParsedChange={setLengthInches}
              unit={unit}
              placeholder={unit === 'metric' ? 'e.g. 250 mm' : 'e.g. 10"'}
            />
          </View>
        </View>
      </Card>

      {diagramInput ? (
        <Card style={{ padding: theme.spacing.sm }}>
          <BendDiagram input={diagramInput} />
        </Card>
      ) : null}

      <ResultGroup
        hero={{
          label: 'Total gain (for conduit length)',
          value: gainMeasurement?.value,
          unit: gainMeasurement?.unit,
        }}
        hint={hint}
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
        expectedInches={calibratedGain}
        label="Total gain"
        unit={unit}
      />

      <FeasibilityPanel
        result={feasibility}
        isPro={access === 'unlocked'}
        unit={unit}
        onCheckFeasibility={() => navigation.navigate('Paywall')}
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
            Mark layout (developed length along conduit)
          </Text>
          {result.marks.map((mark) => (
            <View key={mark.id} style={styles.markRow}>
              <View style={{ flex: 1 }}>
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
                    color: theme.colors.textSecondary,
                    fontSize: theme.fontSize.secondary,
                    marginTop: 2,
                  }}
                >
                  {mark.instruction}
                </Text>
              </View>
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.fontSize.body,
                  fontWeight: theme.fontWeight.semibold,
                  fontVariant: ['tabular-nums'],
                  marginLeft: theme.spacing.sm,
                }}
              >
                {mark.developedInches === 0
                  ? 'Start'
                  : `+${formatInches(mark.developedInches)}"`}
              </Text>
            </View>
          ))}
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            {`Bend 90° first, measure ${formatInches(
              result.marks[1]?.developedInches ?? 0,
            )}" along the conduit from Mark 1 to Mark 2, then bend ${formatInches(result.kickAngleDeg)}°`}
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
  input: {
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    fontVariant: ['tabular-nums'],
  },
  markRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
