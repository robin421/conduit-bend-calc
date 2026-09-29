import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  buildCalibratedSpec,
  calibrateGain,
  calibrateStubTakeUp,
} from '../calculators/calibration/calibration';
import {
  defaultBenderSpec,
  displaySpecName,
} from '../calculators/geometry/benderSpecs';
import BenderPicker from '../components/benderPicker';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import ImperialInput from '../components/imperialInput';
import type { BenderSpec } from '../constants';
import { saveBenderSpec } from '../lib/benderSpecStore';
import { formatLength } from '../lib/units';
import { useUnitSystem } from '../lib/unitStore';
import { useCustomSpecs } from '../lib/customSpecs';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text
        style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.infoValue,
          { color: theme.colors.textPrimary, fontVariant: ['tabular-nums'] },
        ]}
      >
        {value ?? '—'}
      </Text>
    </View>
  );
}

function SectionHint({ children }: { children: string }) {
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

export default function CalibrationScreen() {
  const theme = useTheme();
  const { unit } = useUnitSystem();
  const [spec, setSpec] = useState<BenderSpec>(() => defaultBenderSpec());
  const { specs: customSpecs, addSpec } = useCustomSpecs();

  const [l0Text, setL0Text] = useState('');
  const [l0, setL0] = useState<number | null>(null);
  const [legAText, setLegAText] = useState('');
  const [legA, setLegA] = useState<number | null>(null);
  const [legBText, setLegBText] = useState('');
  const [legB, setLegB] = useState<number | null>(null);

  const [targetText, setTargetText] = useState('');
  const [target, setTarget] = useState<number | null>(null);
  const [actualText, setActualText] = useState('');
  const [actual, setActual] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Gain 法：G = A+B−L₀，R = G/(2−π/2)
  const gainResult = useMemo(() => {
    if (l0 === null || legA === null || legB === null) {
      return null;
    }
    return calibrateGain(l0, legA, legB);
  }, [l0, legA, legB]);

  // Stub 法：effective take-up = oldTakeUp + (actual − target)
  const takeUpResult = useMemo(() => {
    if (target === null || actual === null) {
      return null;
    }
    return calibrateStubTakeUp(spec.takeUp, target, actual);
  }, [actual, spec.takeUp, target]);

  const canSave =
    name.trim().length > 0 && (gainResult !== null || takeUpResult !== null);

  const handleCreateCustom = useCallback(
    (created: BenderSpec) => {
      void addSpec(created).then(() => setSpec(created));
    },
    [addSpec],
  );

  const handleSave = useCallback(() => {
    if (!canSave || saving) {
      return;
    }
    const built = buildCalibratedSpec(
      name,
      spec,
      gainResult?.radius ?? null,
      takeUpResult,
    );
    if (!built) {
      return;
    }
    setSaving(true);
    void addSpec(built)
      .then(() => {
        saveBenderSpec(built);
        setSpec(built);
        setSavedMessage(
          `Saved "${displaySpecName(built)}": R=${formatLength(built.centerlineRadius, unit)}, take-up=${formatLength(built.takeUp, unit)} — now selected as the bender for all calculators and available in every bender picker.`,
        );
      })
      .finally(() => setSaving(false));
  }, [addSpec, canSave, gainResult, name, saving, spec, takeUpResult, unit]);

  const handleClear = useCallback(() => {
    setL0Text('');
    setL0(null);
    setLegAText('');
    setLegA(null);
    setLegBText('');
    setLegB(null);
    setTargetText('');
    setTarget(null);
    setActualText('');
    setActual(null);
    setName('');
    setSavedMessage(null);
    setSpec(defaultBenderSpec());
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { padding: theme.spacing.md, gap: theme.spacing.md },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={{ gap: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          Step 1: Pick the bender to calibrate
        </Text>
        <BenderPicker
          spec={spec}
          customSpecs={customSpecs}
          onChange={setSpec}
          onCreateCustom={handleCreateCustom}
        />
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          Step 2: Calibrate R with the gain method (optional)
        </Text>
        <SectionHint>
          Take a scrap of known length L₀, bend a 90° in the middle, and measure legs A and B (from the back of the bend to each end).
        </SectionHint>
        <ImperialInput
          label="Scrap length L₀"
          value={l0Text}
          onChangeText={setL0Text}
          onParsedChange={setL0}
          placeholder={`e.g. 30"`}
          unit={unit}
        />
        <ImperialInput
          label="Leg A"
          value={legAText}
          onChangeText={setLegAText}
          onParsedChange={setLegA}
          placeholder={`e.g. 17"`}
          unit={unit}
        />
        <ImperialInput
          label="Leg B"
          value={legBText}
          onChangeText={setLegBText}
          onParsedChange={setLegB}
          placeholder={`e.g. 14.3"`}
          unit={unit}
        />
        <InfoRow
          label="Gain（A+B−L₀）"
          value={gainResult ? formatLength(gainResult.gain, unit) : undefined}
        />
        <InfoRow
          label="Calibrated radius R"
          value={gainResult ? formatLength(gainResult.radius, unit) : undefined}
        />
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          Step 3: Calibrate take-up with the stub method (optional)
        </Text>
        <SectionHint>
          Bend a stub to the target height using the current take-up, then measure the actual height you got.
        </SectionHint>
        <ImperialInput
          label="Target height"
          value={targetText}
          onChangeText={setTargetText}
          onParsedChange={setTarget}
          placeholder={`e.g. 12"`}
          unit={unit}
        />
        <ImperialInput
          label="Actual height"
          value={actualText}
          onChangeText={setActualText}
          onParsedChange={setActual}
          placeholder={`e.g. 12.4"`}
          unit={unit}
        />
        <InfoRow
          label={`Old take-up (${displaySpecName(spec)})`}
          value={formatLength(spec.takeUp, unit)}
        />
        <InfoRow
          label="Calibrated take-up"
          value={takeUpResult !== null ? formatLength(takeUpResult, unit) : undefined}
        />
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          Step 4: Save as a custom bender
        </Text>
        <SectionHint>
          Uncalibrated values keep the Step 1 spec. Saved on this device and available in every calculator's bender picker.
        </SectionHint>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name it, e.g. My Ideal (field-tested)"
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
        <BigButton
          title={saving ? 'Saving…' : 'Save as Custom'}
          onPress={handleSave}
          disabled={!canSave || saving}
        />
        {savedMessage ? (
          <Text
            style={{
              color: theme.colors.success,
              fontSize: theme.fontSize.secondary,
              lineHeight: 20,
            }}
          >
            {savedMessage}
          </Text>
        ) : null}
      </Card>

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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 17,
    fontWeight: '600',
  },
  input: {
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
