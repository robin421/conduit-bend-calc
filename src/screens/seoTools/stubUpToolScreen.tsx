import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import ImperialInput from '../../components/imperialInput';
import { TAKE_UP_OPTIONS } from '../../constants';
import type { EmtTakeUpSize } from '../../constants';
import { useUnitSystem } from '../../lib/unitStore';
import { getSeoToolPage } from '../../seo/toolPages';
import { useTheme } from '../../theme';
import {
  formatSeoLength,
  FaqSection,
  MoreFreeTools,
  SeoCard,
  SeoHeading,
  SeoPage,
  SeoParagraph,
  SeoResultCard,
  SeoSection,
  SeoUnitToggle,
  TakeUpTable,
} from './seoLayout';

const PAGE = getSeoToolPage('stubUp');
const DEFAULT_SIZE: EmtTakeUpSize = '1/2';

export default function StubUpToolScreen() {
  const theme = useTheme();
  const { unit, setUnit } = useUnitSystem();
  const [heightText, setHeightText] = useState('');
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const [size, setSize] = useState<EmtTakeUpSize>(DEFAULT_SIZE);

  const option = useMemo(
    () => TAKE_UP_OPTIONS.find((entry) => entry.size === size) ?? TAKE_UP_OPTIONS[0],
    [size],
  );
  const takeUp = option.takeUpInches;

  const mark =
    heightInches === null ? null : heightInches - takeUp;
  const tooShort = mark !== null && mark <= 0;

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
          label="Target stub height"
          value={heightText}
          onChangeText={setHeightText}
          onParsedChange={setHeightInches}
          unit={unit}
          placeholder={unit === 'metric' ? 'e.g. 300 mm' : 'e.g. 12"'}
        />

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.sm,
            marginBottom: theme.spacing.sm,
          }}
        >
          Conduit size (EMT)
        </Text>
        <View style={styles.sizeRow}>
          {TAKE_UP_OPTIONS.map((entry) => {
            const selected = entry.size === size;
            return (
              <Pressable
                key={entry.size}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSize(entry.size)}
                style={[
                  styles.sizeButton,
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
                    fontSize: theme.fontSize.body,
                    fontWeight: theme.fontWeight.semibold,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {entry.label}
                </Text>
                <Text
                  style={{
                    color: selected
                      ? theme.colors.onAccent
                      : theme.colors.textSecondary,
                    fontSize: theme.fontSize.secondary,
                    marginTop: 2,
                  }}
                >
                  {entry.takeUpInches}&quot; take-up
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SeoCard>

      <SeoResultCard
        headline="Mark location (from conduit end)"
        headlineValue={
          mark !== null && !tooShort ? formatSeoLength(mark, unit) : undefined
        }
        rows={[
          {
            label: 'Target height',
            value:
              heightInches !== null ? formatSeoLength(heightInches, unit) : '—',
          },
          { label: 'Take-up', value: `${takeUp}"` },
        ]}
      />
      {tooShort ? (
        <Text
          style={{
            color: theme.colors.error,
            fontSize: theme.fontSize.secondary,
          }}
        >
          Target height must be greater than the {takeUp}&quot; take-up.
        </Text>
      ) : null}

      <SeoSection title="What is a stub-up?">
        <SeoParagraph>{PAGE.tagline}</SeoParagraph>
        <SeoParagraph>
          Mark location = target height − take-up. For a 12&quot; stub with
          1/2&quot; EMT: 12&quot; − 5&quot; = 7&quot; from the end. Put the
          bender arrow on the mark, bend to 90°, and the back of the bend lands
          at exactly 12&quot;.
        </SeoParagraph>
      </SeoSection>

      <SeoSection title="Take-up chart (hand benders, EMT)">
        <TakeUpTable />
        <SeoParagraph>
          Take-up is a property of the bender head, not a formula — always
          confirm against the markings on the bender in your hands. If every
          stub comes out consistently off, bend one test stub on scrap and apply
          that correction.
        </SeoParagraph>
      </SeoSection>

      <FaqSection page={PAGE} />

      <MoreFreeTools current={PAGE} />
    </SeoPage>
  );
}

const styles = StyleSheet.create({
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeButton: {
    minHeight: 56,
    flexGrow: 1,
    flexBasis: '28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
