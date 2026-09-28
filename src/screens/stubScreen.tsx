import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  createCustomSpec,
  defaultBenderSpec,
  displaySpecName,
  legacySizeToSpec,
  resolveSpecKey,
  specKey,
} from '../calculators/geometry/benderSpecs';
import { calculateStubUpMark } from '../calculators/geometry/geometry';
import { stubWarnings } from '../calculators/warnings/warnings';
import BenderRow from '../components/benderRow';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import BendDiagram from '../components/bendDiagram';
import type { DiagramInput } from '../calculators/diagrams/diagrams.ts';
import ImperialInput from '../components/imperialInput';
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import { useBenderSpec } from '../lib/benderSpecStore';
import { useCustomSpecs } from '../lib/customSpecs';
import { createHistoryId, useHistoryAutoSave } from '../lib/history';
import { useScreenMemory } from '../lib/screenMemory';
import type { HistoryEntry } from '../lib/historyStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Stub'>;

function formatInches(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function StubScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const [memory, setMemory] = useScreenMemory('stub', { heightText: '' });
  const { heightText } = memory;
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const { spec, setSpec } = useBenderSpec();
  const { specs: customSpecs } = useCustomSpecs();

  const setHeightText = useCallback(
    (text: string) => setMemory((prev) => ({ ...prev, heightText: text })),
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
    if (backfill.specKey) {
      const resolved = resolveSpecKey(backfill.specKey, customSpecs);
      if (resolved) {
        setSpec(resolved);
        return;
      }
    }
    // 兼容 v1.0.x 历史记录（当时按 EMT 规格 / 手填 take-up 选择）
    if (backfill.selectedSize) {
      setSpec(legacySizeToSpec(backfill.selectedSize));
    } else if (backfill.takeUpText) {
      const typed = Number(backfill.takeUpText.trim());
      if (Number.isFinite(typed) && typed > 0) {
        const custom = createCustomSpec(
          'Manual take-up',
          defaultBenderSpec().centerlineRadius,
          typed,
        );
        if (custom) {
          setSpec(custom);
        }
      }
    }
  }, [backfill, customSpecs]);

  // 经由几何引擎：mark = H − takeUp，take-up 取自所选规格（D2 配对存储）
  const markPoint = useMemo(() => {
    if (heightInches === null) {
      return null;
    }
    return calculateStubUpMark(heightInches, spec);
  }, [heightInches, spec]);

  const diagramInput = useMemo<DiagramInput | null>(() => {
    if (markPoint === null || heightInches === null) {
      return null;
    }
    return { kind: 'stub', stubHeight: heightInches, markPoint };
  }, [markPoint, heightInches]);

  const warnings = useMemo(() => {
    if (heightInches === null) {
      return [];
    }
    return stubWarnings(heightInches, spec);
  }, [heightInches, spec]);

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (markPoint === null || heightInches === null) {
      return null;
    }
    return {
      id: createHistoryId(),
      kind: 'stub',
      title: '90° Stub',
      inputSummary: `${heightText.trim()} · ${displaySpecName(spec)}`,
      resultSummary: `Mark at ${formatInches(markPoint)}"`,
      timestamp: Date.now(),
      params: { heightText, specKey: specKey(spec) },
      signature: `stub|${heightInches}|${specKey(spec)}`,
    };
  }, [heightInches, heightText, markPoint, spec]);

  useHistoryAutoSave(historyEntry);

  const handleClear = useCallback(() => {
    setMemory({ heightText: '' });
    setHeightInches(null);
  }, [setMemory]);

  let hint: string | undefined;
  if (heightInches === null) {
    hint = 'Enter values to see results';
  } else if (markPoint === null) {
    hint = 'Target height must exceed take-up';
  }

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
            label="Target height"
            value={heightText}
            onChangeText={setHeightText}
            onParsedChange={setHeightInches}
            placeholder={`e.g. 12"`}
          />
        </View>
      </Card>

      {diagramInput ? (
        <Card style={{ padding: theme.spacing.sm }}>
          <BendDiagram input={diagramInput} />
        </Card>
      ) : null}

      <ResultGroup
        hero={{
          label: 'Mark location',
          value: markPoint !== null ? formatInches(markPoint) : undefined,
          unit: '"',
        }}
        hint={hint}
      />
      {markPoint !== null ? (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
          }}
        >
          Mark with the arrow
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
});
