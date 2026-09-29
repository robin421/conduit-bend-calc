import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { calibrateFromTestBend } from '../calculators/calibration/calibration';
import { profileToSpec } from '../lib/profile';
import type { BenderProfile } from '../lib/profile';
import type { BenderSpec } from '../constants';
import BenderPicker from '../components/benderPicker';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import ImperialInput from '../components/imperialInput';
import {
  setActiveProfile,
  standardProfiles,
  upsertProfile,
} from '../lib/benderProfileStore';
import { withCalibration } from '../lib/profile';
import { useUnitSystem } from '../lib/unitStore';
import { formatMeasurement, inchesToMm } from '../lib/units';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'GuidedCalibration'>;

/** 试弯固定标记距离（英寸）。 */
const TEST_BEND_MARK = 12;

const STANDARD_PROFILES = standardProfiles();

function SectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.body,
        fontWeight: theme.fontWeight.semibold,
      }}
    >
      {children}
    </Text>
  );
}

function Hint({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.secondary,
        lineHeight: 20,
      }}
    >
      {children}
    </Text>
  );
}

export default function GuidedCalibrationScreen({
  navigation,
}: Props) {
  const theme = useTheme();
  const { unit } = useUnitSystem();
  const [base, setBase] = useState<BenderProfile>(STANDARD_PROFILES[0]);
  const [measuredText, setMeasuredText] = useState('');
  const [measuredInches, setMeasuredInches] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  const nominalDeduct = base.nominalDeduct ?? base.takeUp;
  const computed = useMemo(() => {
    if (measuredInches === null) {
      return null;
    }
    return calibrateFromTestBend(
      TEST_BEND_MARK,
      measuredInches,
      base.bendRadius,
      nominalDeduct,
    );
  }, [base.bendRadius, measuredInches, nominalDeduct]);

  const canSave = name.trim().length > 0 && computed !== null;

  const handlePickerChange = useCallback((spec: BenderSpec) => {
    const match = STANDARD_PROFILES.find(
      (profile) => profile.id === `standard|${spec.brand}|${spec.model}|${spec.conduit}`,
    );
    if (match) {
      setBase(match);
    }
    setSaved(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!canSave || !computed) {
      return;
    }
    const profile = withCalibration(base, {
      name: name.trim(),
      actualDeduct: computed.actualDeduct,
      bendRadius: computed.estimatedRadius,
      calibrationDate: Date.now(),
    });
    upsertProfile(profile);
    setActiveProfile(profile.id);
    setSaved(`Saved "${profile.name}". All calculators now use your calibrated bender.`);
    setName('');
    setMeasuredText('');
    setMeasuredInches(null);
  }, [base, canSave, computed, name]);

  const deductMeasurement = computed
    ? formatMeasurement(computed.actualDeduct, unit)
    : undefined;
  const radiusMeasurement = computed
    ? formatMeasurement(computed.estimatedRadius, unit)
    : undefined;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { padding: theme.spacing.sm, gap: theme.spacing.sm },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionLabel>Step 1: Pick the conduit</SectionLabel>
        <Hint>
          Choose the bender and conduit size you are about to use. Standard values are a
          starting point — one test bend makes them exact.
        </Hint>
        <BenderPicker
          spec={profileToSpec(base)}
          customSpecs={[]}
          onChange={handlePickerChange}
          onCreateCustom={() => undefined}
          allowCustom={false}
        />
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <SectionLabel>Step 2: Make one test bend</SectionLabel>
        <Hint>
          Mark the conduit 12 in from the end. Line the bender arrow up with that mark and
          bend a 90° stub.
        </Hint>
        <View
          style={[
            styles.diagram,
            { borderColor: theme.colors.border, borderRadius: theme.radius },
          ]}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
              fontVariant: ['tabular-nums'],
            }}
          >
            {`End ─────●───── 12${unit === 'metric' ? ` in (${Math.round(inchesToMm(TEST_BEND_MARK))} mm)` : '"'} mark`}
          </Text>
        </View>
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <SectionLabel>Step 3: Measure the stub height</SectionLabel>
        <Hint>
          Measure from the end of the conduit to the back of the bend (the finished stub
          height).
        </Hint>
        <ImperialInput
          label="Measured stub height"
          value={measuredText}
          onChangeText={setMeasuredText}
          onParsedChange={setMeasuredInches}
          unit={unit}
          placeholder={unit === 'metric' ? 'e.g. 440 mm' : `e.g. 17 3/8"`}
        />
        <View style={styles.infoRow}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
            Actual deduct
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {deductMeasurement ? `${deductMeasurement.value} ${deductMeasurement.unit}` : '—'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
            Estimated bend radius
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.semibold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {radiusMeasurement ? `${radiusMeasurement.value} ${radiusMeasurement.unit}` : '—'}
          </Text>
        </View>
        <Hint>
          The radius is an estimate from this one bend. It keeps improving as you give
          expected vs actual feedback.
        </Hint>
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <SectionLabel>Step 4: Save your bender</SectionLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={`Name it, e.g. My Klein 3/4" EMT`}
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              borderRadius: theme.radius,
              color: theme.colors.textPrimary,
              fontSize: theme.fontSize.body,
              paddingHorizontal: theme.spacing.md,
            },
          ]}
        />
        <BigButton title="Save Bender" onPress={handleSave} disabled={!canSave} />
        {saved ? (
          <Text
            style={{
              color: theme.colors.success,
              fontSize: theme.fontSize.secondary,
              lineHeight: 20,
            }}
          >
            {saved}
          </Text>
        ) : null}
      </Card>

      <BigButton
        title="Advanced calibration"
        variant="secondary"
        onPress={() => navigation.navigate('Calibration')}
      />
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
  diagram: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
