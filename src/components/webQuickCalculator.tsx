import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { calculateOffset } from '../calculators/offset/offset';
import { calculateStubUpMark } from '../calculators/geometry/geometry';
import { defaultBenderSpec } from '../calculators/geometry/benderSpecs';
import Card from './card';
import ImperialInput from './imperialInput';
import ResultGroup from './resultGroup';
import type { OffsetAngle } from '../constants';
import { useCalculatorAnalytics } from '../lib/analytics';
import { useUnitSystem } from '../lib/unitStore';
import { formatLength, formatMeasurement } from '../lib/units';
import { useTheme } from '../theme';

interface Props {
  onOpenStub?: () => void;
  onOpenOffset?: () => void;
}

const STUB_PRESETS_INCHES = [6, 10, 12, 18, 24];
const OFFSET_PRESETS_INCHES = [2, 4, 6, 8, 10];
const OFFSET_ANGLES: readonly OffsetAngle[] = [10, 22.5, 30, 45, 60];

const EMT_TAKE_UPS: Record<string, { takeUp: number; radius: number }> = {
  '1/2"': { takeUp: 5, radius: 4 },
  '3/4"': { takeUp: 6, radius: 4.5 },
  '1"': { takeUp: 8, radius: 5.75 },
};

export default function WebQuickCalculator({ onOpenStub, onOpenOffset }: Props) {
  const theme = useTheme();
  const { unit } = useUnitSystem();
  const [mode, setMode] = useState<'stub' | 'offset'>('stub');

  // Stub State
  const [stubSize, setStubSize] = useState<'1/2"' | '3/4"' | '1"'>('1/2"');
  const [stubHeightText, setStubHeightText] = useState('12');
  const [stubHeightInches, setStubHeightInches] = useState<number | null>(12);

  // Offset State
  const [offsetAngle, setOffsetAngle] = useState<OffsetAngle>(30);
  const [offsetHeightText, setOffsetHeightText] = useState('6');
  const [offsetHeightInches, setOffsetHeightInches] = useState<number | null>(6);

  // Stub Calculation
  const stubSpec = useMemo(() => {
    const base = defaultBenderSpec();
    const config = EMT_TAKE_UPS[stubSize];
    return {
      ...base,
      conduit: `EMT ${stubSize}`,
      takeUp: config.takeUp,
      centerlineRadius: config.radius,
    };
  }, [stubSize]);

  const stubMark = useMemo(() => {
    if (stubHeightInches === null || stubHeightInches <= stubSpec.takeUp) {
      return null;
    }
    return calculateStubUpMark(stubHeightInches, stubSpec);
  }, [stubHeightInches, stubSpec]);

  const stubSignature = stubMark !== null ? `web_stub|${stubHeightInches}|${stubSize}` : null;
  const unitSystem = unit === 'metric' ? 'metric' : 'imperial';
  useCalculatorAnalytics('stub', mode === 'stub' ? stubSignature : null, { unitSystem });

  // Offset Calculation
  const offsetResult = useMemo(() => {
    if (offsetHeightInches === null || offsetHeightInches <= 0) {
      return null;
    }
    return calculateOffset(offsetHeightInches, offsetAngle, stubSpec.centerlineRadius);
  }, [offsetHeightInches, offsetAngle, stubSpec.centerlineRadius]);

  const offsetSignature = offsetResult ? `web_offset|${offsetHeightInches}|${offsetAngle}` : null;
  useCalculatorAnalytics('offset', mode === 'offset' ? offsetSignature : null, { unitSystem });

  const stubMarkMeasurement =
    stubMark !== null ? formatMeasurement(stubMark, unit) : undefined;

  const handlePresetStub = useCallback((inches: number) => {
    setStubHeightInches(inches);
    setStubHeightText(unit === 'metric' ? `${Math.round(inches * 25.4)}` : `${inches}`);
  }, [unit]);

  const handlePresetOffset = useCallback((inches: number) => {
    setOffsetHeightInches(inches);
    setOffsetHeightText(unit === 'metric' ? `${Math.round(inches * 25.4)}` : `${inches}`);
  }, [unit]);

  return (
    <Card style={[styles.container, { borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius }]}>
      {/* 模式选择 Header */}
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.headerTitle,
            { color: theme.colors.textPrimary, fontSize: 18 },
          ]}
        >
          Instant Calculator
        </Text>
        <View
          style={[
            styles.modeSegmentTrack,
            {
              backgroundColor: theme.scheme === 'dark' ? theme.colors.background : '#EAF0F6',
              borderColor: theme.colors.border,
              borderRadius: theme.radius,
            },
          ]}
        >
          {(
            [
              { key: 'stub', label: '90° Stub' },
              { key: 'offset', label: 'Offset' },
            ] as const
          ).map((item) => {
            const selected = mode === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setMode(item.key)}
                hitSlop={4}
                style={(state) => {
                  const { focused } = state as { focused?: boolean };
                  return [
                    styles.modeSegmentItem,
                    selected
                      ? {
                          backgroundColor: theme.scheme === 'dark' ? theme.colors.primary : '#FFFFFF',
                          borderColor: theme.scheme === 'dark' ? theme.colors.accent : '#C8D4E0',
                        }
                      : {
                          backgroundColor: 'transparent',
                          borderColor: 'transparent',
                        },
                    Platform.OS === 'web' && focused
                      ? ({
                          outlineStyle: 'solid',
                          outlineWidth: 2,
                          outlineColor: theme.colors.accentText,
                        } as object)
                      : null,
                  ];
                }}
              >
                <Text
                  style={{
                    color: selected ? theme.colors.textPrimary : theme.colors.textSecondary,
                    fontSize: 13,
                    fontWeight: selected ? '600' : '500',
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {mode === 'stub' ? (
        <View style={{ gap: theme.spacing.sm }}>
          {/* EMT 规格切换 */}
          <View style={styles.presetRow}>
            <Text style={[styles.subLabel, { color: theme.colors.textSecondary }]}>
              EMT Size:
            </Text>
            {(['1/2"', '3/4"', '1"'] as const).map((size) => {
              const selected = stubSize === size;
              return (
                <Pressable
                  key={size}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setStubSize(size)}
                  hitSlop={4}
                  style={(state) => {
                    const { hovered, focused } = state as { hovered?: boolean; focused?: boolean };
                    return [
                      styles.sizeButton,
                      {
                        borderRadius: theme.radius,
                        backgroundColor: selected
                          ? theme.colors.primary
                          : theme.colors.card,
                        borderColor: selected
                          ? theme.colors.primary
                          : Platform.OS === 'web' && hovered
                            ? theme.colors.textSecondary
                            : theme.colors.border,
                      },
                      Platform.OS === 'web' && focused
                        ? ({
                            outlineStyle: 'solid',
                            outlineWidth: 2,
                            outlineColor: selected ? theme.colors.accent : theme.colors.accentText,
                          } as object)
                        : null,
                    ];
                  }}
                >
                  <Text
                    style={{
                      color: selected ? theme.colors.onPrimary : theme.colors.textPrimary,
                      fontSize: 13,
                      fontWeight: '600',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {size}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 目标高度输入 */}
          <ImperialInput
            label="Target Height"
            value={stubHeightText}
            onChangeText={setStubHeightText}
            onParsedChange={setStubHeightInches}
            unit={unit}
            placeholder={unit === 'metric' ? 'e.g. 300 mm' : 'e.g. 12"'}
          />

          {/* 常用高度预设 */}
          <View style={styles.presetRow}>
            <Text style={[styles.subLabel, { color: theme.colors.textSecondary }]}>
              Presets:
            </Text>
            {STUB_PRESETS_INCHES.map((val) => {
              const selected = stubHeightInches === val;
              return (
                <Pressable
                  key={val}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => handlePresetStub(val)}
                  hitSlop={4}
                  style={(state) => {
                    const { hovered, focused } = state as { hovered?: boolean; focused?: boolean };
                    return [
                      styles.presetTag,
                      {
                        borderRadius: theme.radius,
                        backgroundColor: selected
                          ? theme.scheme === 'dark'
                            ? theme.colors.controlAccent
                            : '#FFFBEB'
                          : theme.colors.background,
                        borderColor: selected
                          ? theme.colors.accentText
                          : Platform.OS === 'web' && hovered
                            ? theme.colors.textSecondary
                            : theme.colors.border,
                      },
                      Platform.OS === 'web' && focused
                        ? ({
                            outlineStyle: 'solid',
                            outlineWidth: 2,
                            outlineColor: theme.colors.accentText,
                          } as object)
                        : null,
                    ];
                  }}
                >
                  <Text
                    style={{
                      color: selected
                        ? theme.scheme === 'dark'
                          ? theme.colors.onControlAccent
                          : theme.colors.accentText
                        : theme.colors.textPrimary,
                      fontSize: 13,
                      fontWeight: selected ? '600' : '500',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {unit === 'metric' ? `${Math.round(val * 25.4)}` : `${val}"`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 结果呈现 */}
          <ResultGroup
            hero={{
              label: `Mark Location (Take-up ${stubSpec.takeUp}")`,
              value: stubMarkMeasurement?.value,
              unit: stubMarkMeasurement?.unit,
            }}
            hint={
              stubMark === null
                ? 'Target height must exceed take-up'
                : undefined
            }
          />

          {onOpenStub ? (
            <Text
              accessibilityRole="link"
              onPress={onOpenStub}
              style={[styles.fullLink, { color: theme.colors.accentText }]}
            >
              Open dedicated 90° Stub calculator with diagram & calibration →
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {/* 角度选择 */}
          <View style={styles.presetRow}>
            <Text style={[styles.subLabel, { color: theme.colors.textSecondary }]}>
              Bend Angle:
            </Text>
            {OFFSET_ANGLES.map((ang) => {
              const selected = offsetAngle === ang;
              return (
                <Pressable
                  key={ang}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setOffsetAngle(ang)}
                  hitSlop={4}
                  style={(state) => {
                    const { hovered, focused } = state as { hovered?: boolean; focused?: boolean };
                    return [
                      styles.presetTag,
                      {
                        borderRadius: theme.radius,
                        backgroundColor: selected
                          ? theme.scheme === 'dark'
                            ? theme.colors.controlAccent
                            : '#FFFBEB'
                          : theme.colors.background,
                        borderColor: selected
                          ? theme.colors.accentText
                          : Platform.OS === 'web' && hovered
                            ? theme.colors.textSecondary
                            : theme.colors.border,
                      },
                      Platform.OS === 'web' && focused
                        ? ({
                            outlineStyle: 'solid',
                            outlineWidth: 2,
                            outlineColor: theme.colors.accentText,
                          } as object)
                        : null,
                    ];
                  }}
                >
                  <Text
                    style={{
                      color: selected
                        ? theme.scheme === 'dark'
                          ? theme.colors.onControlAccent
                          : theme.colors.accentText
                        : theme.colors.textPrimary,
                      fontSize: 13,
                      fontWeight: selected ? '600' : '500',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {`${ang}°`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 偏移高度输入 */}
          <ImperialInput
            label="Offset Height (Rise)"
            value={offsetHeightText}
            onChangeText={setOffsetHeightText}
            onParsedChange={setOffsetHeightInches}
            unit={unit}
            placeholder={unit === 'metric' ? 'e.g. 150 mm' : 'e.g. 6"'}
          />

          {/* 常用高度预设 */}
          <View style={styles.presetRow}>
            <Text style={[styles.subLabel, { color: theme.colors.textSecondary }]}>
              Presets:
            </Text>
            {OFFSET_PRESETS_INCHES.map((val) => {
              const selected = offsetHeightInches === val;
              return (
                <Pressable
                  key={val}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => handlePresetOffset(val)}
                  hitSlop={4}
                  style={(state) => {
                    const { hovered, focused } = state as { hovered?: boolean; focused?: boolean };
                    return [
                      styles.presetTag,
                      {
                        borderRadius: theme.radius,
                        backgroundColor: selected
                          ? theme.scheme === 'dark'
                            ? theme.colors.controlAccent
                            : '#FFFBEB'
                          : theme.colors.background,
                        borderColor: selected
                          ? theme.colors.accentText
                          : Platform.OS === 'web' && hovered
                            ? theme.colors.textSecondary
                            : theme.colors.border,
                      },
                      Platform.OS === 'web' && focused
                        ? ({
                            outlineStyle: 'solid',
                            outlineWidth: 2,
                            outlineColor: theme.colors.accentText,
                          } as object)
                        : null,
                    ];
                  }}
                >
                  <Text
                    style={{
                      color: selected
                        ? theme.scheme === 'dark'
                          ? theme.colors.onControlAccent
                          : theme.colors.accentText
                        : theme.colors.textPrimary,
                      fontSize: 13,
                      fontWeight: selected ? '600' : '500',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {unit === 'metric' ? `${Math.round(val * 25.4)}` : `${val}"`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 结果呈现 */}
          <ResultGroup
            hero={{
              label: 'Distance Between Marks',
              value: offsetResult
                ? formatLength(offsetResult.distanceBetweenBends, unit)
                : undefined,
            }}
            rows={[
              {
                label: 'Total Shrink',
                value: offsetResult
                  ? formatLength(offsetResult.shrink, unit)
                  : undefined,
              },
            ]}
            hint={
              offsetResult === null
                ? 'Enter offset height to see mark spacing'
                : undefined
            }
          />

          {onOpenOffset ? (
            <Text
              accessibilityRole="link"
              onPress={onOpenOffset}
              style={[styles.fullLink, { color: theme.colors.accentText }]}
            >
              Open dedicated Offset calculator with diagram & cheat sheet →
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontWeight: '700',
  },
  modeSegmentTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    padding: 3,
    borderWidth: 1,
  },
  modeSegmentItem: {
    minWidth: 74,
    height: '100%',
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
  sizeButton: {
    minWidth: 50,
    height: 36,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetTag: {
    minWidth: 42,
    height: 34,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullLink: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    paddingVertical: 10,
    minHeight: 44,
  },
});
