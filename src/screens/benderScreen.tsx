import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import BenderPicker from '../components/benderPicker';
import Card from '../components/card';
import WebCalcShell from '../components/webCalcShell';
import type { BenderSpec } from '../constants';
import { useBenderSpec } from '../lib/benderSpecStore';
import { useCustomSpecs } from '../lib/customSpecs';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Bender'>;

export default function BenderScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { spec, setSpec } = useBenderSpec();
  const { specs: customSpecs, addSpec } = useCustomSpecs();
  const conduitTypeFilter = route.params?.conduitTypeFilter;

  const handleChange = useCallback(
    (next: BenderSpec) => {
      setSpec(next);
      navigation.goBack();
    },
    [navigation, setSpec],
  );

  const handleCreateCustom = useCallback(
    (created: BenderSpec) => {
      void addSpec(created).then(() => {
        setSpec(created);
        navigation.goBack();
      });
    },
    [addSpec, navigation, setSpec],
  );

  return (
    <WebCalcShell title="Bender Setup" singleColumnMaxWidth={960}>
      <Card style={{ padding: theme.spacing.sm }}>
        <BenderPicker
          spec={spec}
          customSpecs={customSpecs}
          onChange={handleChange}
          onCreateCustom={handleCreateCustom}
          onUnlockPro={() => navigation.navigate('Paywall', { triggerSource: 'bender_picker', intent: { kind: 'bender', conduitTypeFilter } })}
          conduitTypeFilter={conduitTypeFilter}
          startCustom={route.params?.createCustom}
        />
      </Card>
    </WebCalcShell>
  );
}
