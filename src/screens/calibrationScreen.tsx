import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

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
import WebCalcShell from '../components/webCalcShell';
import type { BenderSpec } from '../constants';
import { useI18n } from '../i18n';
import { selectSpecByValue } from '../lib/benderProfileStore';
import { saveBenderSpec } from '../lib/benderSpecStore';
import { useCustomSpecs } from '../lib/customSpecs';
import { trackGrowthEvent } from '../lib/growth';
import {
  clearPendingCalibrationDraft,
  deltaBucket,
  savePendingCalibrationDraft,
} from '../lib/pendingCalibrationDraftStore';
import { normalizeProSource } from '../lib/proFlow';
import { useProAccess } from '../lib/proStore';
import { formatLength } from '../lib/units';
import { useUnitSystem } from '../lib/unitStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Calibration'>;

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

/** Full Fingerprint 默认废料长度（英寸），预填、用户可改。 */
const DEFAULT_SCRAP_LENGTH = 24;

export default function CalibrationScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const { unit } = useUnitSystem();
  const { access } = useProAccess();
  const [spec, setSpec] = useState<BenderSpec>(() => defaultBenderSpec());
  const { specs: customSpecs, addSpec } = useCustomSpecs();

  const [l0Text, setL0Text] = useState(String(DEFAULT_SCRAP_LENGTH));
  const [l0, setL0] = useState<number | null>(DEFAULT_SCRAP_LENGTH);
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

  const startedRef = useRef(false);
  const previewedRef = useRef(false);
  const rawEntrySource = route.params?.entrySource;
  const entrySource = normalizeProSource(rawEntrySource ?? 'full_fingerprint_save');

  // 进入 Full Fingerprint 上报一次 calibration_try_started（无 PII）。
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackGrowthEvent('calibration_try_started', {
      source: entrySource,
      mode: 'full',
    });
  }, [entrySource]);

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

  // 首次得出有效校准结果时单次去重上报 calibration_result_previewed（仅离散分桶）。
  useEffect(() => {
    if (previewedRef.current) return;
    if (gainResult === null && takeUpResult === null) return;
    previewedRef.current = true;
    const measuredTakeUp = takeUpResult ?? spec.takeUp;
    const delta =
      takeUpResult !== null
        ? measuredTakeUp - spec.takeUp
        : gainResult !== null
          ? gainResult.radius - spec.centerlineRadius
          : 0;
    trackGrowthEvent('calibration_result_previewed', {
      source: entrySource,
      mode: 'full',
      delta_bucket: deltaBucket(delta),
    });
  }, [entrySource, gainResult, spec.centerlineRadius, spec.takeUp, takeUpResult]);

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
    if (access === 'locked' || Platform.OS === 'web') {
      const now = Date.now();
      const baseTakeUp = spec.takeUp;
      const measuredTakeUp = built.takeUp;
      setSaving(true);
      void savePendingCalibrationDraft({
        mode: 'manual',
        baseTakeUp,
        measuredTakeUp,
        deltaInches: measuredTakeUp - baseTakeUp,
        profileName: displaySpecName(built),
        spec: built,
        entrySource,
        createdAt: now,
      })
        .finally(() => {
          setSaving(false);
          trackGrowthEvent('calibration_save_gated', {
            source: entrySource,
            mode: 'full',
          });
          navigation.navigate('Paywall', {
            triggerSource: rawEntrySource ?? 'full_fingerprint_save',
            intent: { kind: 'calibration' },
          });
        });
      return;
    }
    setSaving(true);
    void addSpec(built)
      .then(() => {
        saveBenderSpec(built);
        selectSpecByValue(built);
        setSpec(built);
        trackGrowthEvent('bender_calibrated', { source: 'manual' });
        void clearPendingCalibrationDraft();
        setSavedMessage(
          t('calibration.full.savedMessage', {
            name: displaySpecName(built),
            radius: formatLength(built.centerlineRadius, unit),
            takeUp: formatLength(built.takeUp, unit),
          }),
        );
      })
      .finally(() => setSaving(false));
  }, [
    access,
    addSpec,
    canSave,
    entrySource,
    gainResult,
    name,
    navigation,
    rawEntrySource,
    saving,
    spec,
    t,
    takeUpResult,
    unit,
  ]);

  const handleClear = useCallback(() => {
    setL0Text(String(DEFAULT_SCRAP_LENGTH));
    setL0(DEFAULT_SCRAP_LENGTH);
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
    <WebCalcShell title={t('nav.fullFingerprint')} spacing="md" singleColumnMaxWidth={960}>
      <Card style={{ gap: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.semibold,
          }}
        >
          {t('calibration.full.step1Title')}
        </Text>
        <BenderPicker
          spec={spec}
          customSpecs={customSpecs}
          onChange={setSpec}
          onCreateCustom={handleCreateCustom}
          onUnlockPro={() =>
            navigation.navigate('Paywall', {
              triggerSource: 'bender_picker',
              intent: { kind: 'bender' },
            })
          }
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
          {t('calibration.full.step2Title')}
        </Text>
        <SectionHint>
          {t('calibration.full.step2Hint', {
            length: formatLength(DEFAULT_SCRAP_LENGTH, unit),
          })}
        </SectionHint>
        <ImperialInput
          label={t('calibration.full.scrapLength')}
          value={l0Text}
          onChangeText={setL0Text}
          onParsedChange={setL0}
          placeholder={t('calibration.full.placeholderExample', {
            value: formatLength(DEFAULT_SCRAP_LENGTH, unit),
          })}
          unit={unit}
        />
        <ImperialInput
          label={t('calibration.full.legA')}
          value={legAText}
          onChangeText={setLegAText}
          onParsedChange={setLegA}
          placeholder={t('calibration.full.placeholderExample', {
            value: formatLength(13, unit),
          })}
          unit={unit}
        />
        <ImperialInput
          label={t('calibration.full.legB')}
          value={legBText}
          onChangeText={setLegBText}
          onParsedChange={setLegB}
          placeholder={t('calibration.full.placeholderExample', {
            value: formatLength(12.5, unit),
          })}
          unit={unit}
        />
        <InfoRow
          label={t('calibration.full.gainRow')}
          value={gainResult ? formatLength(gainResult.gain, unit) : undefined}
        />
        <InfoRow
          label={t('calibration.full.radiusRow')}
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
          {t('calibration.full.step3Title')}
        </Text>
        <SectionHint>{t('calibration.full.step3Hint')}</SectionHint>
        <ImperialInput
          label={t('calibration.full.targetHeight')}
          value={targetText}
          onChangeText={setTargetText}
          onParsedChange={setTarget}
          placeholder={t('calibration.full.placeholderExample', {
            value: formatLength(12, unit),
          })}
          unit={unit}
        />
        <ImperialInput
          label={t('calibration.full.actualHeight')}
          value={actualText}
          onChangeText={setActualText}
          onParsedChange={setActual}
          placeholder={t('calibration.full.placeholderExample', {
            value: formatLength(12.5, unit),
          })}
          unit={unit}
        />
        <InfoRow
          label={t('calibration.full.oldTakeUp', { name: displaySpecName(spec) })}
          value={formatLength(spec.takeUp, unit)}
        />
        <InfoRow
          label={t('calibration.full.calibratedTakeUp')}
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
          {t('calibration.full.step4Title')}
        </Text>
        <SectionHint>{t('calibration.full.step4Hint')}</SectionHint>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('calibration.full.namePlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          selectionColor={theme.colors.selection}
          cursorColor={theme.colors.accentText}
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
              paddingVertical: Platform.OS === 'android' ? 8 : 12,
            },
          ]}
        />
        <BigButton
          title={saving ? t('calibration.full.savingButton') : t('calibration.full.saveButton')}
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

      <BigButton title={t('common.clear')} variant="secondary" onPress={handleClear} />
    </WebCalcShell>
  );
}

const styles = StyleSheet.create({
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
