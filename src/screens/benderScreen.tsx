import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import BenderPicker from '../components/benderPicker';
import Card from '../components/card';
import type { BenderSpec } from '../constants';
import { useBenderSpec } from '../lib/benderSpecStore';
import { useCustomSpecs } from '../lib/customSpecs';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Bender'>;

export default function BenderScreen({ navigation }: Props) {
  const theme = useTheme();
  const { spec, setSpec } = useBenderSpec();
  const { specs: customSpecs, addSpec } = useCustomSpecs();

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
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { padding: theme.spacing.sm, gap: theme.spacing.sm },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={{ padding: theme.spacing.sm }}>
        <BenderPicker
          spec={spec}
          customSpecs={customSpecs}
          onChange={handleChange}
          onCreateCustom={handleCreateCustom}
          onUnlockPro={() => navigation.navigate('Paywall')}
        />
      </Card>
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
});
