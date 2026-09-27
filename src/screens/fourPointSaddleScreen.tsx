import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { calculateFourPointSaddle } from '../calculators/saddle/saddle';
import {
  defaultBenderSpec,
  resolveSpecKey,
  specKey,
} from '../calculators/geometry/benderSpecs';
import BenderPicker from '../components/benderPicker';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import ImperialInput from '../components/imperialInput';
import ResultDisplay from '../components/resultDisplay';
import type { BenderSpec } from '../constants';
import { OffsetAngle, OFFSET_ANGLES } from '../constants';
import { useCustomSpecs } from '../lib/customSpecs';
import { createHistoryId, useHistoryAutoSave } from '../lib/history';
import type { HistoryEntry } from '../lib/historyStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'FourPointSaddle'>;

const DEFAULT_ANGLE: OffsetAngle = 30;

function formatInches(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatFromCenter(value: number): string {
  if (value === 0) {
    return '中心';
  }
  const abs = formatInches(Math.abs(value));
  return value < 0 ? `中心 −${abs}"` : `中心 +${abs}"`;
}

export default function FourPointSaddleScreen({ route }: Props) {
  const theme = useTheme();
  const [heightText, setHeightText] = useState('');
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const [widthText, setWidthText] = useState('');
  const [widthInches, setWidthInches] = useState<number | null>(null);
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
    if (backfill.widthText !== undefined) {
      setWidthText(backfill.widthText);
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

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (!result || heightInches === null || widthInches === null) {
      return null;
    }
    return {
      id: createHistoryId(),
      kind: 'fourPointSaddle',
      title: '4-Point Saddle',
      inputSummary: `${heightText.trim()} · ${widthText.trim()} · ${angle}°`,
      resultSummary: `间距 ${formatInches(result.markSpacingInches)}" · 跨度 ${formatInches(result.spanInches)}"`,
      timestamp: Date.now(),
      params: { heightText, widthText, angle, specKey: specKey(spec) },
      signature: `four-point-saddle|${heightInches}|${widthInches}|${angle}`,
    };
  }, [angle, heightInches, heightText, result, spec, widthInches, widthText]);

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
    setWidthText('');
    setWidthInches(null);
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
            label="障碍高度"
            value={heightText}
            onChangeText={setHeightText}
            onParsedChange={setHeightInches}
            placeholder={`例如 6"`}
          />

          <ImperialInput
            label="障碍宽度"
            value={widthText}
            onChangeText={setWidthText}
            onParsedChange={setWidthInches}
            placeholder={`例如 4"`}
            style={{ marginTop: theme.spacing.md }}
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
        label="弯曲点间距（边缘 ↔ 弯曲点）"
        value={result ? formatInches(result.markSpacingInches) : undefined}
        unit='"'
        hint={hint}
      />

      {result ? (
        <Card style={{ gap: theme.spacing.md }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            分步标记 · 总跨度 {formatInches(result.spanInches)}&quot;
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
                {formatFromCenter(mark.fromCenterInches)}
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
  markRow: {
    width: '100%',
  },
});
