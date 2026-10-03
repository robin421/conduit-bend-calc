import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { calculateFourPointSaddle } from '../../calculators/saddle/saddle';
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

const PAGE = getSeoToolPage('saddle4');
const DEFAULT_ANGLE: OffsetAngle = 30;
/** GA4 tool_name 口径。 */
const TOOL_NAME = '4-point-saddle' as const;

export default function FourPointSaddleToolScreen() {
  const theme = useTheme();
  const { unit, setUnit } = useUnitSystem();
  const [heightText, setHeightText] = useState('');
  const [widthText, setWidthText] = useState('');
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const [widthInches, setWidthInches] = useState<number | null>(null);
  const [angle, setAngle] = useState<OffsetAngle>(DEFAULT_ANGLE);

  const result = useMemo(() => {
    if (heightInches === null || widthInches === null) {
      return null;
    }
    return calculateFourPointSaddle(heightInches, widthInches, angle);
  }, [heightInches, widthInches, angle]);

  const markRows = result
    ? result.marks.map((mark) => ({
        label: mark.label,
        value: `${formatSeoLength(Math.abs(mark.fromCenterInches), unit)} ${
          mark.fromCenterInches < 0 ? 'left' : mark.fromCenterInches > 0 ? 'right' : ''
        } of center`.trim(),
      }))
    : [];

  // 有效结果签名：变化即视为发生一次计算。
  const signature = result
    ? `${result.markSpacingInches}|${result.spanInches}|${result.totalShrinkInches ?? ''}|${angle}`
    : null;
  useCalculatorAnalytics('saddle4', signature);
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

        <ImperialInput
          label="Obstruction height"
          value={heightText}
          onChangeText={setHeightText}
          onParsedChange={setHeightInches}
          unit={unit}
          placeholder={unit === 'metric' ? 'e.g. 150 mm' : 'e.g. 6"'}
        />
        <View style={{ marginTop: theme.spacing.sm }}>
          <ImperialInput
            label="Obstruction width"
            value={widthText}
            onChangeText={setWidthText}
            onParsedChange={setWidthInches}
            unit={unit}
            placeholder={unit === 'metric' ? 'e.g. 100 mm' : 'e.g. 4"'}
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
        headline="Mark spacing (obstacle edge ↔ bend)"
        headlineValue={
          result ? formatSeoLength(result.markSpacingInches, unit) : undefined
        }
        rows={[
          ...markRows,
          {
            label: 'Total span (Mark 1 → Mark 4)',
            value: result ? formatSeoLength(result.spanInches, unit) : '—',
          },
          {
            label: 'Total shrink (add to cut length)',
            value:
              result && result.totalShrinkInches !== undefined
                ? formatSeoLength(result.totalShrinkInches, unit)
                : '—',
          },
        ]}
      />

      <SeoSection title="What is a 4-point saddle?">
        <SeoParagraph>{PAGE.tagline}</SeoParagraph>
        <SeoParagraph>
          Each half is a standard offset, so the outer marks sit one mark
          spacing outside each obstacle edge and the inner marks land on the
          edges. Mark all four points before bending, keep the same angle on all
          four bends so both ends stay parallel, and test-fit before the final
          cut.
        </SeoParagraph>
      </SeoSection>

      <SeoSection title="Multiplier and shrink chart">
        <OffsetMultiplierTable />
        <SeoParagraph>
          A 4-point saddle shrinks twice — once per offset. Two 4&quot; offsets
          at 30° eat 2 × (4 × 1/4&quot;) = 2&quot; of run length, so add the
          total shrink to your cut length.
        </SeoParagraph>
      </SeoSection>

      <FaqSection page={PAGE} toolName={TOOL_NAME} />

      <MoreFreeTools current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
