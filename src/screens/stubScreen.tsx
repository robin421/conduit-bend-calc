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
import BenderStatusBanner from '../components/benderStatusBanner';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import ConduitTypeToggle from '../components/conduitTypeToggle';
import BendDiagram from '../components/bendDiagram';
import type { DiagramInput } from '../calculators/diagrams/diagrams.ts';
import ExpectedActualFeedback from '../components/expectedActualFeedback';
import FeasibilityPanel from '../components/feasibilityPanel';
import ImperialInput from '../components/imperialInput';
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import { stubFeasibility } from '../calculators/feasibility/feasibility';
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
import { useCalculatorAnalytics } from '../lib/analytics';
import { useFirebaseCalculationCompleted } from '../lib/firebase';
import { useScreenMemory } from '../lib/screenMemory';
import { useUnitSystem } from '../lib/unitStore';
import { formatLength, formatMeasurement } from '../lib/units';
import type { HistoryEntry } from '../lib/historyStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Stub'>;


export default function StubScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { unit } = useUnitSystem();
  const [memory, setMemory] = useScreenMemory('stub', { heightText: '' });
  const { heightText } = memory;
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const { spec, setSpec } = useBenderSpec();
  const { specs: customSpecs } = useCustomSpecs();
  const { activeProfile } = useBenderProfiles();
  const { access } = useProAccess();

  /** 屏幕级导体材质（本屏默认 EMT），约束弯管机规格选择。 */
  const [conduitType, setConduitType] = useState<ConduitType>('EMT');

  const setHeightText = useCallback(
    (text: string) => setMemory((prev) => ({ ...prev, heightText: text })),
    [setMemory],
  );

  const backfill = route.params?.backfill;

  // 材质与当前全局规格不一致时，自动切到该材质的第一个预设规格。
  // 注：历史回填（含 v1.0.x legacy）在后面单独处理，会覆盖这里的选择。
  useEffect(() => {
    if (matchesConduitType(spec.conduit, conduitType)) {
      return;
    }
    const next = findFirstSpecByConduitType(conduitType);
    if (next) {
      setSpec(next);
    }
  }, [conduitType, spec, setSpec]);

  const handleConduitTypeChange = useCallback((next: ConduitType) => {
    setConduitType(next);
  }, []);

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
    return { kind: 'stub', unit, stubHeight: heightInches, markPoint };
  }, [markPoint, heightInches, unit]);

  const warnings = useMemo(() => {
    if (heightInches === null) {
      return [];
    }
    return stubWarnings(heightInches, spec);
  }, [heightInches, spec]);

  const feasibility = useMemo(() => {
    if (heightInches === null) {
      return null;
    }
    return stubFeasibility(heightInches, spec, unit);
  }, [heightInches, spec, unit]);

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (markPoint === null || heightInches === null) {
      return null;
    }
    return {
      id: createHistoryId(),
      kind: 'stub',
      title: '90° Stub',
      inputSummary: `${heightText.trim()} · ${displaySpecName(spec)}`,
      resultSummary: `Mark at ${formatLength(markPoint, unit)}`,
      timestamp: Date.now(),
      params: { heightText, specKey: specKey(spec) },
      signature: `stub|${heightInches}|${specKey(spec)}`,
    };
  }, [heightInches, heightText, markPoint, spec, unit]);

  useHistoryAutoSave(historyEntry);
  useCalculatorAnalytics('stub', historyEntry?.signature ?? null);
  useFirebaseCalculationCompleted('stub', historyEntry?.signature ?? null);

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

  const calibratedMark =
    markPoint !== null ? applyCalibrationOffset(markPoint, activeProfile) : null;
  const markMeasurement =
    calibratedMark !== null ? formatMeasurement(calibratedMark, unit) : undefined;

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
            label="Target height"
            value={heightText}
            onChangeText={setHeightText}
            onParsedChange={setHeightInches}
            unit={unit}
            placeholder={unit === 'metric' ? 'e.g. 300 mm' : 'e.g. 12"'}
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
          value: markMeasurement?.value,
          unit: markMeasurement?.unit,
        }}
        hint={hint}
      />

      <BenderStatusBanner
        profile={activeProfile}
        isPro={access === 'unlocked'}
        showCalibrateCta={markPoint !== null}
        onCalibrate={() =>
          navigation.navigate(
            access === 'unlocked' ? 'GuidedCalibration' : 'Paywall',
          )
        }
      />

      <ExpectedActualFeedback
        profile={activeProfile}
        expectedInches={calibratedMark}
        label="Mark location"
        unit={unit}
      />

      <FeasibilityPanel
        result={feasibility}
        isPro={access === 'unlocked'}
        unit={unit}
        onCheckFeasibility={() => navigation.navigate('Paywall')}
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
