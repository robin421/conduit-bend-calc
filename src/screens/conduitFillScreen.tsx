import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { calculateConduitFill } from '../calculators/conduitFill/conduitFill';
import Card from '../components/card';
import NumberField, { parseNumberInput } from '../components/numberField';
import OptionRow from '../components/optionRow';
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import { RACEWAY_TYPES, TRADE_SIZES, WIRE_SIZES, wireSizeLabel } from '../constants';
import type { RacewayType, TradeSize, WireSize } from '../constants';
import type { LayoutWarning } from '../calculators/warnings/warnings';
import { useScreenMemory } from '../lib/screenMemory';
import { useCalculatorAnalytics } from '../lib/analytics';
import { useFirebaseCalculationCompleted } from '../lib/firebase';
import { useTheme } from '../theme';

const RACEWAY_LABEL: Record<RacewayType, string> = { EMT: 'EMT', IMC: 'IMC', RMC: 'Rigid', PVC40: 'PVC' };
/** 按钮里不让 "1-1/4" 在连字符处断行。 */
const tradeLabel = (s: TradeSize) => s.replace('-', '\u2011');

export default function ConduitFillScreen() {
  const theme = useTheme();
  const [m, setM] = useScreenMemory('conduitFill', {
    raceway: 'EMT' as RacewayType,
    trade: '3/4' as TradeSize,
    wire: '12' as WireSize,
    countText: '',
  });
  const count = parseNumberInput(m.countText);
  const countError = count !== null && (!Number.isInteger(count) || count < 1) ? 'Enter a whole number of wires' : undefined;

  const result = useMemo(
    () => calculateConduitFill(m.raceway, m.trade, m.wire, count !== null && !countError ? count : undefined),
    [m.raceway, m.trade, m.wire, count, countError],
  );

  const signature = result ? `conduit_fill|${m.raceway}|${m.trade}|${m.wire}|${count ?? ''}` : null;
  useCalculatorAnalytics('conduit_fill', signature);
  useFirebaseCalculationCompleted('conduit_fill', signature);

  const warnings: LayoutWarning[] = [];
  if (result?.fits === false) {
    warnings.push({ level: 'error', message: `Too full: ${count} × ${wireSizeLabel(m.wire)} THHN exceeds NEC fill for ${m.trade}" ${RACEWAY_LABEL[m.raceway]}.` });
  }
  if (result && result.maxConductors === 0) {
    warnings.push({ level: 'error', message: 'Even one conductor of this size does not fit. Go up a trade size.' });
  }

  const rows = result
    ? [
        ...(result.fillFraction !== undefined
          ? [
              { label: 'Your fill', value: `${(result.fillFraction * 100).toFixed(1)}`, unit: '%' },
              { label: 'Allowed fill', value: `${Math.round((result.allowedFraction ?? 0) * 100)}`, unit: '%' },
            ]
          : []),
        { label: 'Raceway area (100%)', value: result.racewayAreaSqIn.toFixed(3), unit: 'in²' },
        { label: 'One conductor', value: result.wireAreaSqIn.toFixed(4), unit: 'in²' },
      ]
    : [];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.content, { padding: theme.spacing.md, gap: theme.spacing.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <OptionRow label="Raceway" options={RACEWAY_TYPES} value={m.raceway} format={(r) => RACEWAY_LABEL[r]} onChange={(raceway) => setM((p) => ({ ...p, raceway }))} />
        <OptionRow label="Trade size (in)" options={TRADE_SIZES} value={m.trade} perRow={5} format={tradeLabel} onChange={(trade) => setM((p) => ({ ...p, trade }))} />
        <OptionRow label="Wire (THHN / THWN-2)" options={WIRE_SIZES} value={m.wire} perRow={6} onChange={(wire) => setM((p) => ({ ...p, wire }))} />
        <NumberField
          label="Number of wires (optional)"
          value={m.countText}
          onChangeText={(countText) => setM((p) => ({ ...p, countText }))}
          placeholder="e.g. 9"
          integer
          error={countError}
        />
      </Card>
      <ResultGroup
        hero={{ label: `Max ${wireSizeLabel(m.wire)} THHN in ${m.trade}" ${RACEWAY_LABEL[m.raceway]}`, value: result ? String(result.maxConductors) : undefined, unit: 'wires' }}
        rows={rows}
      />
      <WarningBar warnings={warnings} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
        NEC 2023 Chapter 9 Tables 1, 4 and 5 (PVC = Schedule 40): 53% for one wire, 31% for two, 40% for three or more (Note 7 rounding).
        All wires the same size. Nipples under 24" may fill to 60%. Check the code edition your AHJ enforces.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
});
