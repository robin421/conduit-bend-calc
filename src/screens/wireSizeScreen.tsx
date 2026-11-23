import { useMemo } from 'react';
import { Text } from 'react-native';

import { calculateWireSize, defaultTempColumn } from '../calculators/wireSize/wireSize';
import Card from '../components/card';
import NumberField, { parseNumberInput } from '../components/numberField';
import OptionRow from '../components/optionRow';
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import WebCalcShell from '../components/webCalcShell';
import { CONTINUOUS_LOAD_FACTOR, TEMP_COLUMNS, wireSizeLabel } from '../constants';
import type { ConductorMetal, TempColumn } from '../constants';
import type { LayoutWarning } from '../calculators/warnings/warnings';
import { useI18n } from '../i18n';
import { useScreenMemory } from '../lib/screenMemory';
import { useCalculatorAnalytics } from '../lib/analytics';
import { useFirebaseCalculationCompleted } from '../lib/firebase';
import { useReviewOnSuccessfulCalc } from '../lib/inAppReview';
import { useTheme } from '../theme';

const COLUMN_CHOICES = ['auto', ...TEMP_COLUMNS] as const;
type ColumnChoice = (typeof COLUMN_CHOICES)[number];

export default function WireSizeScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [m, setM] = useScreenMemory('wireSize', {
    metal: 'copper' as ConductorMetal,
    continuous: 'no' as 'no' | 'yes',
    column: 'auto' as ColumnChoice,
    ampsText: '',
  });
  const amps = parseNumberInput(m.ampsText);
  const ampsError = amps !== null && !(amps > 0) ? t('wireSize.ampsErrorPositive') : undefined;
  const continuous = m.continuous === 'yes';

  const result = useMemo(() => {
    if (amps === null || ampsError) return null;
    return calculateWireSize({ metal: m.metal, amps, continuous, column: m.column === 'auto' ? undefined : (m.column as TempColumn) });
  }, [amps, ampsError, m.metal, continuous, m.column]);

  const signature = result ? `wire_sizing|${m.metal}|${amps}|${continuous}|${m.column}|${result.size}` : null;
  const noteReviewInteraction = useReviewOnSuccessfulCalc(signature, result ? 'ok' : undefined);
  useCalculatorAnalytics('wire_sizing', signature);
  useFirebaseCalculationCompleted('wire_sizing', signature);

  const warnings: LayoutWarning[] = [];
  if (amps !== null && !ampsError && !result) {
    warnings.push({ level: 'error', message: t('wireSize.over500Error') });
  }
  if (result?.smallConductorRuleApplied) {
    warnings.push({ level: 'info', message: t('wireSize.smallRuleNote') });
  }
  if (result?.column === 90) {
    warnings.push({ level: 'warning', message: t('wireSize.temp90Warning') });
  }

  const autoLabel =
    amps !== null && amps > 0
      ? t('wireSize.tempAuto', {
          col: defaultTempColumn(continuous ? amps * CONTINUOUS_LOAD_FACTOR : amps),
        })
      : t('wireSize.autoShort');

  const leftColumn = (
    <Card style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <NumberField label={t('wireSize.loadLabel')} unit="A" value={m.ampsText} onChangeText={(ampsText) => { noteReviewInteraction(); setM((p) => ({ ...p, ampsText })); }} placeholder={t('wireSize.ampsPlaceholder')} error={ampsError} />
      <OptionRow label={t('wireSize.conductorShort')} options={['copper', 'aluminum'] as const} value={m.metal} format={(x) => (x === 'copper' ? t('wireSize.copper') : t('wireSize.aluminum'))} onChange={(metal) => { noteReviewInteraction(); setM((p) => ({ ...p, metal })); }} />
      <OptionRow label={t('wireSize.continuousLabel')} options={['no', 'yes'] as const} value={m.continuous} format={(x) => (x === 'yes' ? t('wireSize.continuousYes') : t('wireSize.continuousNo'))} onChange={(c) => { noteReviewInteraction(); setM((p) => ({ ...p, continuous: c })); }} />
      <OptionRow label={t('wireSize.terminationLabel')} options={COLUMN_CHOICES} value={m.column} format={(c) => (c === 'auto' ? autoLabel : `${c}°C`)} onChange={(column) => { noteReviewInteraction(); setM((p) => ({ ...p, column })) }} />
    </Card>
  );

  const rightColumn = (
    <>
      <ResultGroup
        hero={{ label: t('wireSize.headline'), value: result ? wireSizeLabel(result.size) : undefined }}
        rows={
          result
            ? [
                { label: t('wireSize.ampacityRow', { col: result.column }), value: String(result.ampacity), unit: 'A' },
                { label: t('wireSize.designLoadRow'), value: Number.isInteger(result.requiredAmps) ? String(result.requiredAmps) : result.requiredAmps.toFixed(1), unit: 'A' },
              ]
            : []
        }
        hint={t('wireSize.enterLoadHint')}
      />
      <WarningBar warnings={warnings} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
        {t('wireSize.necNote')}
      </Text>
    </>
  );

  return (
    <WebCalcShell
      title={t('home.tool.wireSize.name')}
      spacing="md"
      left={leftColumn}
      right={rightColumn}
    />
  );
}
