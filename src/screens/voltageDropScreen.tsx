import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { calculateVoltageDrop, smallestSizeWithinDrop } from '../calculators/voltageDrop/voltageDrop';
import type { Phase } from '../calculators/voltageDrop/voltageDrop';
import Card from '../components/card';
import NumberField, { parseNumberInput } from '../components/numberField';
import OptionRow from '../components/optionRow';
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import { DC_RESISTANCE_OHM_PER_KFT, VOLTAGE_DROP_LIMITS, WIRE_SIZES, wireSizeLabel } from '../constants';
import type { ConductorMetal, WireSize } from '../constants';
import type { LayoutWarning } from '../calculators/warnings/warnings';
import { useScreenMemory } from '../lib/screenMemory';
import { useCalculatorAnalytics } from '../lib/analytics';
import { useFirebaseCalculationCompleted } from '../lib/firebase';
import { useUnitSystem } from '../lib/unitStore';
import { useTheme } from '../theme';

const FT_PER_M = 3.28084;
const VOLTAGES = [120, 208, 240, 277, 480] as const;
const LIMITS = ['branch', 'total'] as const;

export default function VoltageDropScreen() {
  const theme = useTheme();
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
  const ampsError = amps !== null && !(amps > 0) ? 'Enter the load in amps' : undefined;
  const lengthError = length !== null && !(length > 0) ? 'Enter the one-way length' : undefined;
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
  useCalculatorAnalytics('voltage_drop', signature, { unitSystem });
  useFirebaseCalculationCompleted('voltage_drop', signature, { unitSystem });

  const suggestion = useMemo(() => {
    if (!result || result.dropFraction <= limit || amps === null || lengthFt === null) return undefined;
    return smallestSizeWithinDrop({ metal: m.metal, amps, lengthFt, volts: m.volts, phase: m.phase }, limit);
  }, [result, limit, amps, lengthFt, m.metal, m.volts, m.phase]);

  const warnings: LayoutWarning[] = [];
  if (result && result.dropFraction > limit) {
    warnings.push({
      level: 'warning',
      message: suggestion
        ? `Over ${limit * 100}%. Use ${wireSizeLabel(suggestion)} ${m.metal} to stay within ${limit * 100}%.`
        : `Over ${limit * 100}% even with 500 kcmil. Shorten the run or raise the voltage.`,
    });
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.content, { padding: theme.spacing.md, gap: theme.spacing.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <OptionRow label="Conductor" options={['copper', 'aluminum'] as const} value={m.metal} format={(x) => (x === 'copper' ? 'Copper' : 'Aluminum')} onChange={(metal) => setM((p) => ({ ...p, metal }))} />
        <OptionRow label="System" options={[1, 3] as const} value={m.phase} format={(x) => (x === 1 ? 'Single-phase' : 'Three-phase')} onChange={(phase) => setM((p) => ({ ...p, phase }))} />
        <OptionRow label="Voltage (V)" options={VOLTAGES} value={m.volts} perRow={5} onChange={(volts) => setM((p) => ({ ...p, volts }))} />
        <OptionRow label="Wire size" options={sizes} value={size} perRow={6} onChange={(s) => setM((p) => ({ ...p, size: s }))} />
        <NumberField label="Load" unit="A" value={m.ampsText} onChangeText={(ampsText) => setM((p) => ({ ...p, ampsText }))} placeholder="e.g. 16" error={ampsError} />
        <NumberField label="One-way length" unit={metric ? 'm' : 'ft'} value={m.lengthText} onChangeText={(lengthText) => setM((p) => ({ ...p, lengthText }))} placeholder={metric ? 'e.g. 30' : 'e.g. 100'} error={lengthError} />
        <OptionRow label="Limit" options={LIMITS} value={m.limit} format={(x) => (x === 'branch' ? 'Branch 3%' : 'Feeder + branch 5%')} onChange={(l) => setM((p) => ({ ...p, limit: l }))} />
      </Card>
      <ResultGroup
        hero={{ label: 'Voltage drop', value: result ? (result.dropFraction * 100).toFixed(2) : undefined, unit: '%' }}
        rows={
          result
            ? [
                { label: 'Drop', value: result.dropVolts.toFixed(2), unit: 'V' },
                { label: 'Voltage at load', value: result.endVolts.toFixed(1), unit: 'V' },
              ]
            : []
        }
        hint="Enter load and length"
      />
      <WarningBar warnings={warnings} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
        NEC Chapter 9 Table 8 DC resistance at 75°C. Single-phase VD = 2·L·R·I, three-phase VD = 1.732·L·R·I.
        Reactance is ignored, so large AC conductors at low power factor read slightly low. 3% / 5% are
        recommendations (210.19(A) Informational Note), not requirements.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
});
