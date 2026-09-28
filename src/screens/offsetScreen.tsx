import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { calculateOffset } from '../calculators/offset/offset';
import { offsetWarnings } from '../calculators/warnings/warnings';
import {
  defaultBenderSpec,
  resolveSpecKey,
  specKey,
} from '../calculators/geometry/benderSpecs';
import BenderPicker from '../components/benderPicker';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import BendDiagram from '../components/bendDiagram';
import type { DiagramInput } from '../calculators/diagrams/diagrams.ts';
import ImperialInput from '../components/imperialInput';
import WarningBar from '../components/warningBar';
import type { BenderSpec } from '../constants';
import { OffsetAngle, OFFSET_ANGLES } from '../constants';
import { useCustomSpecs } from '../lib/customSpecs';
import { createHistoryId, useHistoryAutoSave } from '../lib/history';
import type { HistoryEntry } from '../lib/historyStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Offset'>;

const DEFAULT_ANGLE: OffsetAngle = 30;

function formatInches(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function OffsetScreen({ route }: Props) {
  const theme = useTheme();
  const [heightText, setHeightText] = useState('');
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const [angle, setAngle] = useState<OffsetAngle>(DEFAULT_ANGLE);
  const [spec, setSpec] = useState<BenderSpec>(() => defaultBenderSpec());
  const { specs: customSpecs, addSpec } = useCustomSpecs();

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
      height: heightInches,
      thetaDeg: angle,
      spacingDisplay: result.distanceBetweenBends,
      shrinkDisplay: result.shrink,
    };
  }, [result, heightInches, angle]);

  const warnings = useMemo(() => {
    if (!result) {
      return [];
    }
    return offsetWarnings(result.geometry.vertexSpacing, angle, spec);
  }, [angle, result, spec]);

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (!result || heightInches === null) {
      return null;
    }
    return {
      id: createHistoryId(),
      kind: 'offset',
      title: 'Offset Bend',
      inputSummary: `${heightText.trim()} · ${angle}°`,
      resultSummary: `Spacing ${formatInches(result.distanceBetweenBends)}" · shrink ${formatInches(result.shrink)}"`,
      timestamp: Date.now(),
      params: { heightText, angle, specKey: specKey(spec) },
      signature: `offset|${heightInches}|${angle}`,
    };
  }, [angle, heightInches, heightText, result, spec]);

  useHistoryAutoSave(historyEntry);

  const handleCreateCustom = useCallback(
    (created: BenderSpec) => {
      void addSpec(created).then(() => setSpec(created));
    },
    [addSpec],
  );

  const handleClear = useCallback(() => {
    setHeightText('');
    setHeightInches(null);
    setAngle(DEFAULT_ANGLE);
    setSpec(defaultBenderSpec());
  }, []);

  const distance = result ? formatInches(result.distanceBetweenBends) : '—';
  const shrink = result ? formatInches(result.shrink) : '—';

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { padding: theme.spacing.md, gap: theme.spacing.md },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <BenderPicker
          spec={spec}
          customSpecs={customSpecs}
          onChange={setSpec}
          onCreateCustom={handleCreateCustom}
        />
        <View style={{ marginTop: theme.spacing.md }}>
          <ImperialInput
            label="Obstacle height"
            value={heightText}
            onChangeText={setHeightText}
            onParsedChange={setHeightInches}
            placeholder={`e.g. 6"`}
          />
        </View>

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.md,
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
              size="selection"
              selected={angle === value}
              onPress={() => setAngle(value)}
              style={styles.angleButton}
            />
          ))}
        </View>
      </Card>

      {diagramInput ? (
        <Card>
          <BendDiagram input={diagramInput} />
        </Card>
      ) : null}

      <View
        style={[
          styles.resultCard,
          {
            backgroundColor: theme.colors.resultBackground,
            borderRadius: theme.radius,
            padding: theme.spacing.lg,
          },
        ]}
      >
        <Text
          style={{
            color: theme.colors.resultLabel,
            fontSize: theme.fontSize.secondary,
          }}
        >
          Mark spacing
        </Text>
        <View style={styles.valueRow}>
          <Text
            style={{
              color: theme.colors.resultText,
              fontSize: theme.fontSize.result,
              fontWeight: theme.fontWeight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {distance}
          </Text>
          {result ? (
            <Text
              style={{
                color: theme.colors.accent,
                fontSize: theme.fontSize.body,
                fontWeight: theme.fontWeight.semibold,
                marginLeft: theme.spacing.xs,
              }}
            >
              &quot;
            </Text>
          ) : null}
        </View>

        <Text
          style={{
            color: theme.colors.resultLabel,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.md,
          }}
        >
          Shrink
        </Text>
        <View style={styles.valueRow}>
          <Text
            style={{
              color: theme.colors.resultText,
              fontSize: theme.fontSize.title,
              fontWeight: theme.fontWeight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {shrink}
          </Text>
          {result ? (
            <Text
              style={{
                color: theme.colors.accent,
                fontSize: theme.fontSize.body,
                fontWeight: theme.fontWeight.semibold,
                marginLeft: theme.spacing.xs,
              }}
            >
              &quot;
            </Text>
          ) : null}
        </View>

        {!result ? (
          <Text
            style={{
              color: theme.colors.resultLabel,
              fontSize: theme.fontSize.secondary,
              marginTop: theme.spacing.sm,
            }}
          >
            Enter values to see results
          </Text>
        ) : (
          <Text
            style={{
              color: theme.colors.resultLabel,
              fontSize: theme.fontSize.secondary,
              marginTop: theme.spacing.md,
            }}
          >
            Mark both points with the arrow
          </Text>
        )}
      </View>

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
  },
  resultCard: {
    width: '100%',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 4,
  },
});
