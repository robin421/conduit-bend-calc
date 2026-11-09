import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { calculateOffset } from '../calculators/offset/offset';
import { calculateStubUpMark } from '../calculators/geometry/geometry';
import { defaultBenderSpec } from '../calculators/geometry/benderSpecs';
import BigButton from './bigButton';
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
    <Card style={[styles.container, { borderColor: theme.colors.accent, borderWidth: 1 }]}>
      {/* 模式选择 Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithBadge}>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.colors.textPrimary, fontSize: theme.fontSize.title },
            ]}
          >
            Instant Calculator
          </Text>
          <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
            <Text style={[styles.badgeText, { color: theme.colors.onAccent }]}>
              READY TO CALCULATE
            </Text>
          </View>
        </View>
        <View style={[styles.modeToggle, { gap: theme.spacing.xs }]}>
          <BigButton
            title="90° Stub"
            size="selection"
            selected={mode === 'stub'}
            onPress={() => setMode('stub')}
            style={styles.modeButton}
          />
          <BigButton
            title="Offset"
            size="selection"
            selected={mode === 'offset'}
            onPress={() => setMode('offset')}
            style={styles.modeButton}
          />
        </View>
      </View>

      {mode === 'stub' ? (
        <View style={{ gap: theme.spacing.sm }}>
          {/* EMT 规格切换 */}
          <View style={styles.presetRow}>
            <Text style={[styles.subLabel, { color: theme.colors.textSecondary }]}>
              EMT Size:
            </Text>
            {(['1/2"', '3/4"', '1"'] as const).map((size) => (
              <BigButton
                key={size}
                title={size}
                size="selection"
                selected={stubSize === size}
                onPress={() => setStubSize(size)}
                style={styles.sizeButton}
              />
            ))}
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
            {STUB_PRESETS_INCHES.map((val) => (
              <BigButton
                key={val}
                title={unit === 'metric' ? `${Math.round(val * 25.4)}` : `${val}"`}
                size="selection"
                selected={stubHeightInches === val}
                onPress={() => handlePresetStub(val)}
                style={styles.presetButton}
              />
            ))}
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
            {OFFSET_ANGLES.map((ang) => (
              <BigButton
                key={ang}
                title={`${ang}°`}
                size="selection"
                selected={offsetAngle === ang}
                onPress={() => setOffsetAngle(ang)}
                style={styles.presetButton}
              />
            ))}
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
            {OFFSET_PRESETS_INCHES.map((val) => (
              <BigButton
                key={val}
                title={unit === 'metric' ? `${Math.round(val * 25.4)}` : `${val}"`}
                size="selection"
                selected={offsetHeightInches === val}
                onPress={() => handlePresetOffset(val)}
                style={styles.presetButton}
              />
            ))}
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
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modeToggle: {
    flexDirection: 'row',
  },
  modeButton: {
    minWidth: 80,
    paddingVertical: 6,
    paddingHorizontal: 10,
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
    minWidth: 54,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  presetButton: {
    minWidth: 46,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  fullLink: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    paddingVertical: 4,
  },
});
