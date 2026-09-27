import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  createCustomSpec,
  defaultBenderSpec,
  displaySpecName,
  legacySizeToSpec,
  resolveSpecKey,
  specKey,
} from '../calculators/geometry/benderSpecs';
import { calculateStubUpMark } from '../calculators/geometry/geometry';
import BenderPicker from '../components/benderPicker';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import ImperialInput from '../components/imperialInput';
import ResultDisplay from '../components/resultDisplay';
import type { BenderSpec } from '../constants';
import { useCustomSpecs } from '../lib/customSpecs';
import { createHistoryId, useHistoryAutoSave } from '../lib/history';
import type { HistoryEntry } from '../lib/historyStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Stub'>;

function formatInches(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function StubScreen({ route }: Props) {
  const theme = useTheme();
  const [heightText, setHeightText] = useState('');
  const [heightInches, setHeightInches] = useState<number | null>(null);
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
          '手动 take-up',
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

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (markPoint === null || heightInches === null) {
      return null;
    }
    return {
      id: createHistoryId(),
      kind: 'stub',
      title: '90° Stub',
      inputSummary: `${heightText.trim()} · ${displaySpecName(spec)}`,
      resultSummary: `标记点 ${formatInches(markPoint)}"`,
      timestamp: Date.now(),
      params: { heightText, specKey: specKey(spec) },
      signature: `stub|${heightInches}|${specKey(spec)}`,
    };
  }, [heightInches, heightText, markPoint, spec]);

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
    setSpec(defaultBenderSpec());
  }, []);

  let hint: string | undefined;
  if (heightInches === null) {
    hint = '输入参数查看结果';
  } else if (markPoint === null) {
    hint = '目标高度需大于 take-up';
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
          <ImperialInput
            label="目标高度"
            value={heightText}
            onChangeText={setHeightText}
            onParsedChange={setHeightInches}
            placeholder={`例如 12"`}
          />
        </View>
      </Card>

      <ResultDisplay
        label="标记点位置"
        value={markPoint !== null ? formatInches(markPoint) : undefined}
        unit='"'
        hint={hint}
      />

      <BigButton title="清空" variant="secondary" onPress={handleClear} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});
