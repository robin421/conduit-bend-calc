import { useMemo } from 'react';
import { Text } from 'react-native';

import { calculateVoltageDrop, smallestSizeWithinDrop } from '../calculators/voltageDrop/voltageDrop';
import type { Phase } from '../calculators/voltageDrop/voltageDrop';
import Card from '../components/card';
import NumberField, { parseNumberInput } from '../components/numberField';
import OptionRow from '../components/optionRow';
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import WebCalcShell from '../components/webCalcShell';
import { DC_RESISTANCE_OHM_PER_KFT, VOLTAGE_DROP_LIMITS, WIRE_SIZES, wireSizeLabel } from '../constants';
import type { ConductorMetal, WireSize } from '../constants';
import type { LayoutWarning } from '../calculators/warnings/warnings';
import { useI18n } from '../i18n';
import { useScreenMemory } from '../lib/screenMemory';
import { useCalculatorAnalytics } from '../lib/analytics';
import { useFirebaseCalculationCompleted } from '../lib/firebase';
import { useReviewOnSuccessfulCalc } from '../lib/inAppReview';
import { useUnitSystem } from '../lib/unitStore';
import { useTheme } from '../theme';

const FT_PER_M = 3.28084;
const VOLTAGES = [120, 208, 240, 277, 480] as const;
const LIMITS = ['branch', 'total'] as const;

export default function VoltageDropScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { unit } = useUnitSystem();
  const metric = unit === 'metric';
  const [m, setM] = useScreenMemory('voltageDrop', {
    metal: 'copper' as ConductorMetal,
    phase: 1 as Phase,
    volts: 120 as (typeof VOLTAGES)[number],
    size: '12' as WireSize,
    ampsText: '',
    lengthText: '',
    limit: 'branch' as (typeof LIMITS)[number],
  });

  const amps = parseNumberInput(m.ampsText);
  const length = parseNumberInput(m.lengthText);
  const ampsError = amps !== null && !(amps > 0) ? t('wireSize.ampsErrorPositive') : undefined;
  const lengthError = length !== null && !(length > 0) ? t('voltageDrop.distanceError') : undefined;
  const lengthFt = length !== null && length > 0 ? (metric ? length * FT_PER_M : length) : null;
  const sizes = WIRE_SIZES.filter((s) => DC_RESISTANCE_OHM_PER_KFT[m.metal][s] !== undefined);
  const size = sizes.includes(m.size) ? m.size : sizes[0];
  const limit = VOLTAGE_DROP_LIMITS[m.limit];

  const result = useMemo(() => {
    if (amps === null || ampsError || lengthFt === null) return null;
    return calculateVoltageDrop({ metal: m.metal, size, amps, lengthFt, volts: m.volts, phase: m.phase });
  }, [amps, ampsError, lengthFt, m.metal, size, m.volts, m.phase]);

  const signature = result ? `voltage_drop|${m.metal}|${size}|${amps}|${lengthFt}|${m.volts}|${m.phase}` : null;
  const unitSystem = metric ? 'metric' : 'imperial';
  const noteReviewInteraction = useReviewOnSuccessfulCalc(signature, result ? 'ok' : undefined);
  useCalculatorAnalytics('voltage_drop', signature, { unitSystem });
  useFirebaseCalculationCompleted('voltage_drop', signature, { unitSystem, unitMode: unit });

  const suggestion = useMemo(() => {
    if (!result || result.dropFraction <= limit || amps === null || lengthFt === null) return undefined;
    return smallestSizeWithinDrop({ metal: m.metal, amps, lengthFt, volts: m.volts, phase: m.phase }, limit);
  }, [result, limit, amps, lengthFt, m.metal, m.volts, m.phase]);

  const warnings: LayoutWarning[] = [];
  if (result && result.dropFraction > limit) {
    const limitPct = Math.round(limit * 100);
    const metalLabel =
      m.metal === 'copper' ? t('wireSize.copper').toLowerCase() : t('wireSize.aluminum').toLowerCase();
    warnings.push({
      level: 'warning',
      message: suggestion
        ? t('voltageDrop.overLimitAlert', {
            limit: limitPct,
            wire: wireSizeLabel(suggestion),
            metal: metalLabel,
          })
        : t('voltageDrop.over500Alert', { limit: limitPct }),
    });
  }

  const leftColumn = (
    <Card style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <OptionRow label={t('wireSize.conductorShort')} options={['copper', 'aluminum'] as const} value={m.metal} format={(x) => (x === 'copper' ? t('wireSize.copper') : t('wireSize.aluminum'))} onChange={(metal) => { noteReviewInteraction(); setM((p) => ({ ...p, metal })); }} />
      <OptionRow label={t('voltageDrop.phaseLabel')} options={[1, 3] as const} value={m.phase} format={(x) => (x === 1 ? t('voltageDrop.phase1') : t('voltageDrop.phase3'))} onChange={(phase) => { noteReviewInteraction(); setM((p) => ({ ...p, phase })); }} />
      <OptionRow label={t('voltageDrop.voltageLabel')} options={VOLTAGES} value={m.volts} perRow={5} onChange={(volts) => { noteReviewInteraction(); setM((p) => ({ ...p, volts })); }} />
      <OptionRow label={t('voltageDrop.wireLabel')} options={sizes} value={size} perRow={6} onChange={(s) => { noteReviewInteraction(); setM((p) => ({ ...p, size: s })); }} />
      <NumberField label={t('wireSize.loadLabel')} unit="A" value={m.ampsText} onChangeText={(ampsText) => { noteReviewInteraction(); setM((p) => ({ ...p, ampsText })); }} placeholder={t('voltageDrop.ampsPlaceholder')} error={ampsError} />
      <NumberField label={t('voltageDrop.oneWayLength')} unit={metric ? 'm' : 'ft'} value={m.lengthText} onChangeText={(lengthText) => { noteReviewInteraction(); setM((p) => ({ ...p, lengthText })); }} placeholder={metric ? t('voltageDrop.distancePlaceholderM') : t('voltageDrop.distancePlaceholderFt')} error={lengthError} />
      <OptionRow label={t('voltageDrop.limitLabel')} options={LIMITS} value={m.limit} format={(x) => (x === 'branch' ? t('voltageDrop.limitBranch') : t('voltageDrop.limitTotal'))} onChange={(l) => { noteReviewInteraction(); setM((p) => ({ ...p, limit: l })); }} />
    </Card>
  );

  const rightColumn = (
    <>
      <ResultGroup
        hero={{ label: t('home.tool.voltageDrop.name'), value: result ? (result.dropFraction * 100).toFixed(2) : undefined, unit: '%' }}
        rows={
          result
            ? [
                { label: t('voltageDrop.dropVoltsRow'), value: result.dropVolts.toFixed(2), unit: 'V' },
                { label: t('voltageDrop.endVoltsRow'), value: result.endVolts.toFixed(1), unit: 'V' },
              ]
            : []
        }
        hint={t('voltageDrop.enterLoadLengthHint')}
      />
      <WarningBar warnings={warnings} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
        {t('voltageDrop.necNote')}
      </Text>
    </>
  );

  return (
    <WebCalcShell
      title={t('home.tool.voltageDrop.name')}
      spacing="md"
      left={leftColumn}
      right={rightColumn}
    />
  );
}
