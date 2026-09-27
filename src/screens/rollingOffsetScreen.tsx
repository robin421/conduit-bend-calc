import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  defaultBenderSpec,
  resolveSpecKey,
  specKey,
} from '../calculators/geometry/benderSpecs';
import { calculateRollingOffset } from '../calculators/rollingOffset/rollingOffset';
import { offsetWarnings } from '../calculators/warnings/warnings';
import BenderPicker from '../components/benderPicker';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import BendDiagram from '../components/bendDiagram';
import type { DiagramInput } from '../calculators/diagrams/diagrams.ts';
import ImperialInput from '../components/imperialInput';
import ResultDisplay from '../components/resultDisplay';
import WarningBar from '../components/warningBar';
import type { BenderSpec } from '../constants';
import { OffsetAngle, OFFSET_ANGLES } from '../constants';
import { useCustomSpecs } from '../lib/customSpecs';
import { createHistoryId, useHistoryAutoSave } from '../lib/history';
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

export default function RollingOffsetScreen({ route }: Props) {
  const theme = useTheme();
  const [riseText, setRiseText] = useState('');
  const [riseInches, setRiseInches] = useState<number | null>(null);
  const [rollText, setRollText] = useState('');
  const [rollInches, setRollInches] = useState<number | null>(null);
  const [angle, setAngle] = useState<OffsetAngle>(DEFAULT_ANGLE);
  const [spec, setSpec] = useState<BenderSpec>(() => defaultBenderSpec());
  const { specs: customSpecs, addSpec } = useCustomSpecs();

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
      resultSummary: `间距 ${formatInches(result.spacingDisplay)}" · 旋转 ${formatDeg(result.rollAngleDeg)}°`,
      timestamp: Date.now(),
      params: { riseText, rollText, angle, specKey: specKey(spec) },
      signature: `rollingOffset|${riseInches}|${rollInches}|${angle}|${specKey(spec)}`,
    };
  }, [angle, riseInches, riseText, result, rollInches, rollText, spec]);

  useHistoryAutoSave(historyEntry);

  const handleCreateCustom = useCallback(
    (created: BenderSpec) => {
      void addSpec(created).then(() => setSpec(created));
    },
    [addSpec],
  );

  const handleClear = useCallback(() => {
    setRiseText('');
    setRiseInches(null);
    setRollText('');
    setRollInches(null);
    setAngle(DEFAULT_ANGLE);
    setSpec(defaultBenderSpec());
  }, []);

  const hint = result ? undefined : '输入参数查看结果';

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
            label="上升高度（rise）"
            value={riseText}
            onChangeText={setRiseText}
            onParsedChange={setRiseInches}
            placeholder={`例如 6"`}
          />
          <View style={{ marginTop: theme.spacing.md }}>
            <ImperialInput
              label="侧滚距离（roll）"
              value={rollText}
              onChangeText={setRollText}
              onParsedChange={setRollInches}
              placeholder={`例如 8"`}
            />
          </View>
        </View>

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.sm,
          }}
        >
          弯曲角度
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

      <ResultDisplay
        label="两标记间距"
        value={result ? formatInches(result.spacingDisplay) : undefined}
        unit='"'
        hint={hint}
      />

      {diagramInput ? (
        <Card>
          <BendDiagram input={diagramInput} />
        </Card>
      ) : null}

      <WarningBar warnings={warnings} />

      {result ? (
        <Card style={{ gap: theme.spacing.md }}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
              真实偏移量
            </Text>
            <Text
              style={[
                styles.infoValue,
                { color: theme.colors.textPrimary, fontVariant: ['tabular-nums'] },
              ]}
            >
              {formatInches(result.trueOffset)}&quot;
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
              弯管机旋转角度
            </Text>
            <Text
              style={[
                styles.infoValue,
                { color: theme.colors.textPrimary, fontVariant: ['tabular-nums'] },
              ]}
            >
              {formatDeg(result.rollAngleDeg)}°
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
              Shrink 回补
            </Text>
            <Text
              style={[
                styles.infoValue,
                { color: theme.colors.textPrimary, fontVariant: ['tabular-nums'] },
              ]}
            >
              {formatInches(result.shrinkDisplay)}&quot;
            </Text>
          </View>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            分步标记
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
                {mark.id === 1 ? '起点' : `+${formatInches(mark.fromStartInches)}"`}
              </Text>
            </View>
          ))}
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            先按旋转角度转弯管机，再按两标记间距打点
          </Text>
        </Card>
      ) : null}

      <BigButton title="清空" variant="secondary" onPress={handleClear} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 17,
    fontWeight: '600',
  },
  markRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
