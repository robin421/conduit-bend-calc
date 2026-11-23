import { useMemo } from 'react';
import { Text } from 'react-native';

import { calculateConduitFill } from '../calculators/conduitFill/conduitFill';
import Card from '../components/card';
import NumberField, { parseNumberInput } from '../components/numberField';
import OptionRow from '../components/optionRow';
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import WebCalcShell from '../components/webCalcShell';
import { RACEWAY_TYPES, TRADE_SIZES, WIRE_SIZES, wireSizeLabel } from '../constants';
import type { RacewayType, TradeSize, WireSize } from '../constants';
import type { LayoutWarning } from '../calculators/warnings/warnings';
import { useI18n } from '../i18n';
import { useScreenMemory } from '../lib/screenMemory';
import { useCalculatorAnalytics } from '../lib/analytics';
import { useFirebaseCalculationCompleted } from '../lib/firebase';
import { useReviewOnSuccessfulCalc } from '../lib/inAppReview';
import { useTheme } from '../theme';

const RACEWAY_LABEL: Record<RacewayType, string> = { EMT: 'EMT', IMC: 'IMC', RMC: 'Rigid', PVC40: 'PVC' };
/** 按钮里不让 "1-1/4" 在连字符处断行。 */
const tradeLabel = (s: TradeSize) => s.replace('-', '\u2011');

export default function ConduitFillScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [m, setM] = useScreenMemory('conduitFill', {
    raceway: 'EMT' as RacewayType,
    trade: '3/4' as TradeSize,
    wire: '12' as WireSize,
    countText: '',
  });
  const count = parseNumberInput(m.countText);
  const countError = count !== null && (!Number.isInteger(count) || count < 1) ? t('conduitFill.countErrorWhole') : undefined;

  const result = useMemo(
    () => calculateConduitFill(m.raceway, m.trade, m.wire, count !== null && !countError ? count : undefined),
    [m.raceway, m.trade, m.wire, count, countError],
  );

  const signature = result ? `conduit_fill|${m.raceway}|${m.trade}|${m.wire}|${count ?? ''}` : null;
  const fillStatus = result && (result.fits === false || result.maxConductors === 0) ? 'impossible' : 'ok';
  const noteReviewInteraction = useReviewOnSuccessfulCalc(signature, fillStatus);
  useCalculatorAnalytics('conduit_fill', signature);
  useFirebaseCalculationCompleted('conduit_fill', signature);

  const warnings: LayoutWarning[] = [];
  if (result?.fits === false) {
    warnings.push({
      level: 'error',
      message: t('conduitFill.overfilled', {
        count: count ?? 0,
        wire: wireSizeLabel(m.wire),
        allowed: Math.round((result.allowedFraction ?? 0) * 100),
        trade: m.trade,
        raceway: RACEWAY_LABEL[m.raceway],
      }),
    });
  }
  if (result && result.maxConductors === 0) {
    warnings.push({ level: 'error', message: t('conduitFill.zeroFit') });
  }

  const rows = result
    ? [
        ...(result.fillFraction !== undefined
          ? [
              { label: t('conduitFill.yourFillShort'), value: `${(result.fillFraction * 100).toFixed(1)}`, unit: '%' },
              { label: t('conduitFill.allowedFillShort'), value: `${Math.round((result.allowedFraction ?? 0) * 100)}`, unit: '%' },
            ]
          : []),
        { label: t('conduitFill.racewayArea'), value: result.racewayAreaSqIn.toFixed(3), unit: 'in²' },
        { label: t('conduitFill.oneConductor'), value: result.wireAreaSqIn.toFixed(4), unit: 'in²' },
      ]
    : [];

  const leftColumn = (
    <Card style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <OptionRow label={t('conduitFill.racewayShort')} options={RACEWAY_TYPES} value={m.raceway} format={(r) => RACEWAY_LABEL[r]} onChange={(raceway) => { noteReviewInteraction(); setM((p) => ({ ...p, raceway })); }} />
      <OptionRow label={t('conduitFill.tradeShort')} options={TRADE_SIZES} value={m.trade} perRow={5} format={tradeLabel} onChange={(trade) => { noteReviewInteraction(); setM((p) => ({ ...p, trade })); }} />
      <OptionRow label={t('conduitFill.wireShort')} options={WIRE_SIZES} value={m.wire} perRow={6} onChange={(wire) => { noteReviewInteraction(); setM((p) => ({ ...p, wire })); }} />
      <NumberField
        label={t('conduitFill.countLabel')}
        value={m.countText}
        onChangeText={(countText) => { noteReviewInteraction(); setM((p) => ({ ...p, countText })); }}
        placeholder={t('conduitFill.countPlaceholder')}
        integer
        error={countError}
      />
    </Card>
  );

  const rightColumn = (
    <>
      <ResultGroup
        hero={{
          label: t('conduitFill.maxConductorsHeadline', {
            wire: wireSizeLabel(m.wire),
            trade: m.trade,
            raceway: RACEWAY_LABEL[m.raceway],
          }),
          value: result ? String(result.maxConductors) : undefined,
          unit: t('conduitFill.wiresUnitShort'),
        }}
        rows={rows}
      />
      <WarningBar warnings={warnings} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
        {t('conduitFill.necNoteNative')}
      </Text>
    </>
  );

  return (
    <WebCalcShell
      title={t('home.tool.conduitFill.name')}
      spacing="md"
      left={leftColumn}
      right={rightColumn}
    />
  );
}
