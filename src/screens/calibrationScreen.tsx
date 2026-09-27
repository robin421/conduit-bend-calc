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
import { useCustomSpecs } from '../lib/customSpecs';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Calibration'>;

function formatInches(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

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
        setSpec(built);
        setSavedMessage(
          `已保存「${displaySpecName(built)}」：R=${formatInches(built.centerlineRadius)}"、take-up=${formatInches(built.takeUp)}"，各计算器可在弯管机选择器中找到它。`,
        );
      })
      .finally(() => setSaving(false));
  }, [addSpec, canSave, gainResult, name, saving, spec, takeUpResult]);

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
          第 1 步：选择要校准的弯管机
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
          第 2 步：Gain 法校 R（可选）
        </Text>
        <SectionHint>
          取一段已知长度 L₀ 的废料，在中部弯一个 90°，量两腿 A、B（从弯背到端头）。
        </SectionHint>
        <ImperialInput
          label="废料原长 L₀"
          value={l0Text}
          onChangeText={setL0Text}
          onParsedChange={setL0}
          placeholder={`例如 30"`}
        />
        <ImperialInput
          label="腿 A"
          value={legAText}
          onChangeText={setLegAText}
          onParsedChange={setLegA}
          placeholder={`例如 17"`}
        />
        <ImperialInput
          label="腿 B"
          value={legBText}
          onChangeText={setLegBText}
          onParsedChange={setLegB}
          placeholder={`例如 14.3"`}
        />
        <InfoRow
          label="Gain（A+B−L₀）"
          value={gainResult ? `${formatInches(gainResult.gain)}"` : undefined}
        />
        <InfoRow
          label="校准半径 R"
          value={gainResult ? `${formatInches(gainResult.radius)}"` : undefined}
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
          第 3 步：Stub 法校 take-up（可选）
        </Text>
        <SectionHint>
          用当前 take-up 做一个目标高度的 stub，量出实际弯出的高度。
        </SectionHint>
        <ImperialInput
          label="目标高度"
          value={targetText}
          onChangeText={setTargetText}
          onParsedChange={setTarget}
          placeholder={`例如 12"`}
        />
        <ImperialInput
          label="实际高度"
          value={actualText}
          onChangeText={setActualText}
          onParsedChange={setActual}
          placeholder={`例如 12.4"`}
        />
        <InfoRow
          label={`旧 take-up（${displaySpecName(spec)}）`}
          value={`${formatInches(spec.takeUp)}"`}
        />
        <InfoRow
          label="校准 take-up"
          value={takeUpResult !== null ? `${formatInches(takeUpResult)}"` : undefined}
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
          第 4 步：保存为 Custom 弯管机
        </Text>
        <SectionHint>
          未校准的项沿用第 1 步所选规格。保存后自动存入本机，各计算器的弯管机选择器都能选到。
        </SectionHint>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="起个名字，例如：我的 Ideal（实测）"
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
          title={saving ? '保存中…' : '保存为 Custom'}
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

      <BigButton title="清空" variant="secondary" onPress={handleClear} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
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
