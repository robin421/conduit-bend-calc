import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import {
  createHistoryId,
  formatHistoryTime,
  loadHistory,
  useHistoryAutoSave,
} from '../lib/history';
import { trackEvent, useCalculatorAnalytics } from '../lib/analytics';
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

  const unitSystem = unit === 'metric' ? 'metric' : 'imperial';
  useHistoryAutoSave(historyEntry);
  useCalculatorAnalytics('stub', historyEntry?.signature ?? null, { unitSystem });
  useFirebaseCalculationCompleted('stub', historyEntry?.signature ?? null, { unitSystem });

  const [recentBends, setRecentBends] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    let active = true;
    void loadHistory()
      .then((list) => {
        if (active) {
          const stubs = list.filter((item) => item.kind === 'stub').slice(0, 3);
          setRecentBends(stubs);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [historyEntry?.signature]);

  const handleRefillRecentBend = useCallback(
    (entry: HistoryEntry) => {
      if (entry.params?.heightText !== undefined) {
        setHeightText(entry.params.heightText);
      }
      if (entry.params?.specKey) {
        const resolved = resolveSpecKey(entry.params.specKey, customSpecs);
        if (resolved) {
          setSpec(resolved);
          return;
        }
      }
      if (entry.params?.selectedSize) {
        setSpec(legacySizeToSpec(entry.params.selectedSize));
      }
    },
    [customSpecs, setHeightText, setSpec],
  );

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
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
              marginBottom: theme.spacing.xs,
            }}
          >
            Quick EMT Size Presets
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            {(['1/2', '3/4', '1'] as const).map((sz) => {
              const isSelected =
                spec.conduit.includes(`${sz}"`) && conduitType === 'EMT';
              return (
                <View key={sz} style={{ flex: 1 }}>
                  <BigButton
                    title={`${sz}" EMT`}
                    size="selection"
                    selected={isSelected}
                    onPress={() => {
                      setConduitType('EMT');
                      setSpec(legacySizeToSpec(sz));
                    }}
                  />
                </View>
              );
            })}
          </View>
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
          <View
            style={{
              marginTop: theme.spacing.xs,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.secondary,
                marginRight: 2,
              }}
            >
              Presets:
            </Text>
            {(unit === 'metric'
              ? (['150', '250', '300', '450', '600'] as const)
              : (['6', '10', '12', '18', '24'] as const)
            ).map((h) => {
              const isSelected =
                heightText.trim() === h ||
                heightText.trim() === `${h}"` ||
                heightText.trim() === `${h} mm`;
              return (
                <Pressable
                  key={h}
                  accessibilityRole="button"
                  onPress={() => setHeightText(h)}
                  style={[
                    styles.quickPresetChip,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.accent
                        : theme.colors.card,
                      borderColor: isSelected
                        ? theme.colors.accent
                        : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickPresetText,
                      {
                        color: isSelected
                          ? theme.colors.onAccent
                          : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {unit === 'metric' ? `${h}mm` : `${h}"`}
                  </Text>
                </Pressable>
              );
            })}
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
          label: 'Mark location',
          value: markMeasurement?.value,
          unit: markMeasurement?.unit,
        }}
        hint={hint}
      />

      {recentBends.length > 0 ? (
        <Card style={{ padding: theme.spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.xs,
            }}
          >
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.secondary,
                fontWeight: theme.fontWeight.semibold,
              }}
            >
              Recent 90° Bends (Tap to refill)
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => (navigation.getParent() as any)?.navigate('History')}
            >
              <Text
                style={{
                  color: theme.colors.accent,
                  fontSize: theme.fontSize.secondary,
                }}
              >
                View all →
              </Text>
            </Pressable>
          </View>
          <View style={{ gap: theme.spacing.xs }}>
            {recentBends.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => handleRefillRecentBend(item)}
                style={[
                  styles.recentBendItem,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: theme.fontSize.body,
                      fontWeight: theme.fontWeight.medium,
                    }}
                  >
                    {item.inputSummary}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: theme.fontSize.secondary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {formatHistoryTime(item.timestamp)}
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.colors.accent,
                    fontSize: theme.fontSize.body,
                    fontWeight: theme.fontWeight.semibold,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {item.resultSummary}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      <BenderStatusBanner
        profile={activeProfile}
        isPro={access === 'unlocked'}
        showCalibrateCta={markPoint !== null}
        onCalibrate={() => {
          trackEvent('calibration_cta_click', { source: 'stub_result' });
          if (access === 'unlocked') {
            navigation.navigate('GuidedCalibration');
          } else {
            navigation.navigate('Paywall', { triggerSource: 'stub_calibration' });
          }
        }}
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
        onCheckFeasibility={() =>
          navigation.navigate('Paywall', { triggerSource: 'stub_feasibility' })
        }
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
  quickPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickPresetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recentBendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
