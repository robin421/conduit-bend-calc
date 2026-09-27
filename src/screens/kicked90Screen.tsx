import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  defaultBenderSpec,
  resolveSpecKey,
  specKey,
} from '../calculators/geometry/benderSpecs';
import { calculateKicked90 } from '../calculators/kicked90/kicked90';
import { kicked90Warnings } from '../calculators/warnings/warnings';
import BenderPicker from '../components/benderPicker';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import ImperialInput from '../components/imperialInput';
import ResultDisplay from '../components/resultDisplay';
import WarningBar from '../components/warningBar';
import type { BenderSpec } from '../constants';
import { useCustomSpecs } from '../lib/customSpecs';
import { createHistoryId, useHistoryAutoSave } from '../lib/history';
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

export default function Kicked90Screen({ route }: Props) {
  const theme = useTheme();
  const [kickText, setKickText] = useState('');
  const [lengthText, setLengthText] = useState('');
  const [lengthInches, setLengthInches] = useState<number | null>(null);
  const [spec, setSpec] = useState<BenderSpec>(() => defaultBenderSpec());
  const { specs: customSpecs, addSpec } = useCustomSpecs();

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

  const warnings = useMemo(() => {
    if (kickAngle === null || lengthInches === null) {
      return [];
    }
    return kicked90Warnings(kickAngle, lengthInches, spec);
  }, [kickAngle, lengthInches, spec]);

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (!result || kickAngle === null || lengthInches === null) {
      return null;
    }
    return {
      id: createHistoryId(),
      kind: 'kicked90',
      title: 'Kicked 90°',
      inputSummary: `kick ${kickText.trim()}° · 直段 ${lengthText.trim()}`,
      resultSummary: `总 gain ${formatInches(result.totalGain)}"`,
      timestamp: Date.now(),
      params: { kickText, lengthText, specKey: specKey(spec) },
      signature: `kicked90|${kickAngle}|${lengthInches}|${specKey(spec)}`,
    };
  }, [kickAngle, kickText, lengthInches, lengthText, result, spec]);

  useHistoryAutoSave(historyEntry);

  const handleCreateCustom = useCallback(
    (created: BenderSpec) => {
      void addSpec(created).then(() => setSpec(created));
    },
    [addSpec],
  );

  const handleClear = useCallback(() => {
    setKickText('');
    setLengthText('');
    setLengthInches(null);
    setSpec(defaultBenderSpec());
  }, []);

  const kickInvalid = kickText.trim() !== '' && kickAngle === null;

  let hint: string | undefined;
  if (kickAngle === null || lengthInches === null) {
    hint = kickInvalid ? 'kick 角需为 0–90 之间的数字' : '输入参数查看结果';
  }

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
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
              marginBottom: theme.spacing.xs,
            }}
          >
            Kick 角 κ（度，常用 10–30）
          </Text>
          <TextInput
            value={kickText}
            onChangeText={setKickText}
            placeholder="例如 15"
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
          <View style={{ marginTop: theme.spacing.md }}>
            <ImperialInput
              label="两弯直段 L（切点到切点）"
              value={lengthText}
              onChangeText={setLengthText}
              onParsedChange={setLengthInches}
              placeholder={`例如 10"`}
            />
          </View>
        </View>
      </Card>

      <ResultDisplay
        label="总 gain（料长用）"
        value={result ? formatInches(result.totalGain) : undefined}
        unit='"'
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
            分步标记（沿管展开长）
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
                  ? '起点'
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
            {`先弯 90°，从 Mark 1 沿管量 ${formatInches(
              result.marks[1]?.developedInches ?? 0,
            )}" 到 Mark 2，再弯 ${formatInches(result.kickAngleDeg)}°`}
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
