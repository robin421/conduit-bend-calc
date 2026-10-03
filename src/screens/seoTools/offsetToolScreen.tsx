import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { calculateOffset } from '../../calculators/offset/offset';
import ImperialInput from '../../components/imperialInput';
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

const PAGE = getSeoToolPage('offset');
const DEFAULT_ANGLE: OffsetAngle = 30;

export default function OffsetToolScreen() {
  const theme = useTheme();
  const { unit, setUnit } = useUnitSystem();
  const [riseText, setRiseText] = useState('');
  const [startText, setStartText] = useState('');
  const [riseInches, setRiseInches] = useState<number | null>(null);
  const [startInches, setStartInches] = useState<number | null>(null);
  const [angle, setAngle] = useState<OffsetAngle>(DEFAULT_ANGLE);

  const result = useMemo(() => {
    if (riseInches === null) {
      return null;
    }
    return calculateOffset(riseInches, angle);
  }, [riseInches, angle]);

  const spacing = result ? result.distanceBetweenBends : null;
  const mark1 = startInches ?? 0;
  const mark2 = spacing !== null ? mark1 + spacing : null;

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
          <SeoUnitToggle value={unit} onChange={setUnit} />
        </View>

        <ImperialInput
          label="Offset height (rise)"
          value={riseText}
          onChangeText={setRiseText}
          onParsedChange={setRiseInches}
          unit={unit}
          placeholder={unit === 'metric' ? 'e.g. 150 mm' : 'e.g. 6"'}
        />
        <View style={{ marginTop: theme.spacing.sm }}>
          <ImperialInput
            label="Start of offset from conduit end (optional)"
            value={startText}
            onChangeText={setStartText}
            onParsedChange={setStartInches}
            unit={unit}
            placeholder={unit === 'metric' ? 'e.g. 300 mm' : 'e.g. 12"'}
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
        headline="Mark spacing"
        headlineValue={
          spacing !== null ? formatSeoLength(spacing, unit) : undefined
        }
        rows={[
          {
            label: 'Shrink (add to cut length)',
            value: result ? formatSeoLength(result.shrink, unit) : '—',
          },
          {
            label: 'Mark 1 from conduit end',
            value:
              spacing !== null ? formatSeoLength(mark1, unit) : '—',
          },
          {
            label: 'Mark 2 from conduit end',
            value: mark2 !== null ? formatSeoLength(mark2, unit) : '—',
          },
        ]}
      />

      <SeoSection title="What is an offset bend?">
        <SeoParagraph>{PAGE.tagline}</SeoParagraph>
        <SeoParagraph>
          Mark spacing equals the offset height multiplied by the multiplier for
          your angle. At 30° the multiplier is 2.0, so a 6&quot; offset needs
          12&quot; between marks. Bend the first mark to 30°, flip the bender
          180°, line the arrow up with the second mark, and bend back to 30°.
        </SeoParagraph>
      </SeoSection>

      <SeoSection title="Offset multiplier and shrink chart">
        <OffsetMultiplierTable />
        <SeoParagraph>
          30° is the everyday choice: the math is a clean ×2 and shrink stays
          moderate. Go to 22.5° or 10° when shrink must be minimized, and to
          45° or 60° when a tall obstacle has to be cleared in a short distance.
        </SeoParagraph>
      </SeoSection>

      <FaqSection page={PAGE} />

      <MoreFreeTools current={PAGE} />
    </SeoPage>
  );
}
