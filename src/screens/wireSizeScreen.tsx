import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { calculateWireSize, defaultTempColumn } from '../calculators/wireSize/wireSize';
import NumberField, { parseNumberInput } from '../components/numberField';
import OptionRow from '../components/optionRow';
import ResultGroup from '../components/resultGroup';
import WarningBar from '../components/warningBar';
import { CONTINUOUS_LOAD_FACTOR, TEMP_COLUMNS, wireSizeLabel } from '../constants';
import type { ConductorMetal, TempColumn } from '../constants';
import type { LayoutWarning } from '../calculators/warnings/warnings';
import { useScreenMemory } from '../lib/screenMemory';
import { useTheme } from '../theme';

const COLUMN_CHOICES = ['auto', ...TEMP_COLUMNS] as const;
type ColumnChoice = (typeof COLUMN_CHOICES)[number];

export default function WireSizeScreen() {
  const theme = useTheme();
  const [m, setM] = useScreenMemory('wireSize', {
    metal: 'copper' as ConductorMetal,
    continuous: 'no' as 'no' | 'yes',
    column: 'auto' as ColumnChoice,
    ampsText: '',
  });
  const amps = parseNumberInput(m.ampsText);
  const ampsError = amps !== null && !(amps > 0) ? 'Enter the load in amps' : undefined;
  const continuous = m.continuous === 'yes';

  const result = useMemo(() => {
    if (amps === null || ampsError) return null;
    return calculateWireSize({ metal: m.metal, amps, continuous, column: m.column === 'auto' ? undefined : (m.column as TempColumn) });
  }, [amps, ampsError, m.metal, continuous, m.column]);

  const warnings: LayoutWarning[] = [];
  if (amps !== null && !ampsError && !result) {
    warnings.push({ level: 'error', message: 'Beyond 500 kcmil. Use parallel conductors and size them with your engineer.' });
  }
  if (result?.smallConductorRuleApplied) {
    warnings.push({ level: 'info', message: `Sized up by NEC 240.4(D): 14 AWG Cu max 15 A, 12 AWG Cu 20 A, 10 AWG Cu 30 A.` });
  }
  if (result?.column === 90) {
    warnings.push({ level: 'warning', message: '90°C is only for derating. Terminations limit the final ampacity to 60°C or 75°C (110.14(C)).' });
  }

  const autoLabel = amps !== null && amps > 0 ? `Auto (${defaultTempColumn(continuous ? amps * CONTINUOUS_LOAD_FACTOR : amps)}°C)` : 'Auto';

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.content, { padding: theme.spacing.md, gap: theme.spacing.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <NumberField label="Load" unit="A" value={m.ampsText} onChangeText={(ampsText) => setM((p) => ({ ...p, ampsText }))} placeholder="e.g. 20" error={ampsError} />
      <OptionRow label="Conductor" options={['copper', 'aluminum'] as const} value={m.metal} format={(x) => (x === 'copper' ? 'Copper' : 'Aluminum')} onChange={(metal) => setM((p) => ({ ...p, metal }))} />
      <OptionRow label="Continuous load (3 h or more)" options={['no', 'yes'] as const} value={m.continuous} format={(x) => (x === 'yes' ? 'Yes, ×125%' : 'No')} onChange={(c) => setM((p) => ({ ...p, continuous: c }))} />
      <OptionRow label="Termination rating" options={COLUMN_CHOICES} value={m.column} format={(c) => (c === 'auto' ? autoLabel : `${c}°C`)} onChange={(column) => setM((p) => ({ ...p, column }))} />
      <ResultGroup
        hero={{ label: 'Minimum wire size', value: result ? wireSizeLabel(result.size) : undefined }}
        rows={
          result
            ? [
                { label: `Ampacity at ${result.column}°C`, value: String(result.ampacity), unit: 'A' },
                { label: 'Sized for', value: Number.isInteger(result.requiredAmps) ? String(result.requiredAmps) : result.requiredAmps.toFixed(1), unit: 'A' },
              ]
            : []
        }
        hint="Enter the load"
      />
      <WarningBar warnings={warnings} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>
        NEC 2023 Table 310.16: up to three current-carrying conductors, 30°C ambient. More wires in the raceway or
        hotter ambient need correction and adjustment (310.15). Check voltage drop on long runs.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
});
