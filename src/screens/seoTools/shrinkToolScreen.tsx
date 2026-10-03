import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { calculateOffset } from '../../calculators/offset/offset';
import ImperialInput from '../../components/imperialInput';
import {
  useCalculatorAnalytics,
  useSeoToolCalculateAnalytics,
} from '../../lib/analytics';
import { useUnitSystem } from '../../lib/unitStore';
import { getSeoToolPage } from '../../seo/toolPages';
import { useTheme } from '../../theme';
import type { OffsetAngle } from '../../constants';
import {
  formatSeoLength,
  AngleSelector,
  FaqSection,
  MoreFreeTools,
  OffsetMultiplierTable,
  SeoCard,
  SeoHeading,
  SeoPage,
  SeoParagraph,
  SeoResultCard,
  SeoSection,
  SeoUnitToggle,
} from './seoLayout';

const PAGE = getSeoToolPage('shrink');
const DEFAULT_ANGLE: OffsetAngle = 30;
/** GA4 tool_name 口径。 */
const TOOL_NAME = 'shrink' as const;

type ShrinkMode = 'offset' | 'saddle';

const MODES: readonly { key: ShrinkMode; label: string }[] = [
  { key: 'offset', label: 'Offset' },
  { key: 'saddle', label: 'Saddle (4-point)' },
];

export default function ShrinkToolScreen() {
  const theme = useTheme();
  const { unit, setUnit } = useUnitSystem();
  const [heightText, setHeightText] = useState('');
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const [angle, setAngle] = useState<OffsetAngle>(DEFAULT_ANGLE);
  const [mode, setMode] = useState<ShrinkMode>('offset');

  const result = useMemo(() => {
    if (heightInches === null) {
      return null;
    }
    return calculateOffset(heightInches, angle);
  }, [heightInches, angle]);

  const perInch = result ? result.shrink / (heightInches ?? 1) : null;
  const totalShrink =
    result === null ? null : mode === 'saddle' ? result.shrink * 2 : result.shrink;

  // 有效结果签名：变化即视为发生一次计算。
  const signature = result ? `${result.shrink}|${angle}|${mode}` : null;
  useCalculatorAnalytics('shrink', signature);
  useSeoToolCalculateAnalytics(TOOL_NAME, signature);

  return (
    <SeoPage>
      <SeoHeading level={1}>{PAGE.h1}</SeoHeading>

      <SeoCard>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm,
          }}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            Units
          </Text>
          <SeoUnitToggle value={unit} onChange={setUnit} toolName={TOOL_NAME} />
        </View>

        <View style={styles.modeRow}>
          {MODES.map((option) => {
            const selected = option.key === mode;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setMode(option.key)}
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: selected
                      ? theme.colors.accent
                      : theme.colors.background,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected
                      ? theme.colors.onAccent
                      : theme.colors.textPrimary,
                    fontSize: theme.fontSize.secondary,
                    fontWeight: theme.fontWeight.semibold,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: theme.spacing.sm }}>
          <ImperialInput
            label="Offset height (rise)"
            value={heightText}
            onChangeText={setHeightText}
            onParsedChange={setHeightInches}
            unit={unit}
            placeholder={unit === 'metric' ? 'e.g. 150 mm' : 'e.g. 6"'}
          />
        </View>

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.sm,
            marginBottom: theme.spacing.sm,
          }}
        >
          Bend angle
        </Text>
        <AngleSelector value={angle} onChange={setAngle} />
      </SeoCard>

      <SeoResultCard
        headline={
          mode === 'saddle' ? 'Total shrink (two offsets)' : 'Shrink'
        }
        headlineValue={
          totalShrink !== null ? formatSeoLength(totalShrink, unit) : undefined
        }
        rows={[
          {
            label: 'Shrink per inch of height',
            value: perInch !== null ? formatSeoLength(perInch, unit) : '—',
          },
          {
            label: 'Conduit length to add',
            value: totalShrink !== null ? formatSeoLength(totalShrink, unit) : '—',
          },
        ]}
      />

      <SeoSection title="What is conduit shrink?">
        <SeoParagraph>{PAGE.tagline}</SeoParagraph>
        <SeoParagraph>
          Multiply the offset height by the shrink per inch for your angle. A
          6&quot; offset at 30° shrinks 6 × 1/4&quot; = 1.5&quot;. Shrink is not
          the same as take-up: take-up is where the bend starts before the mark,
          shrink is the run length the bend eats.
        </SeoParagraph>
      </SeoSection>

      <SeoSection title="Shrink chart">
        <OffsetMultiplierTable />
        <SeoParagraph>
          Saddle mode doubles the offset shrink because a 4-point saddle is two
          offsets. A 3-point saddle uses its own smaller center shrink.
        </SeoParagraph>
      </SeoSection>

      <FaqSection page={PAGE} toolName={TOOL_NAME} />

      <MoreFreeTools current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    minHeight: 56,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
