import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import BenderPicker from '../components/benderPicker';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import WebCalcShell from '../components/webCalcShell';
import type { BenderSpec } from '../constants';
import { useI18n } from '../i18n';
import { useBenderSpec } from '../lib/benderSpecStore';
import { useCustomSpecs } from '../lib/customSpecs';
import { useProAccess } from '../lib/proStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Bender'>;

export default function BenderScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const { access } = useProAccess();
  const { spec, setSpec } = useBenderSpec();
  const { specs: customSpecs, addSpec } = useCustomSpecs();
  const conduitTypeFilter = route.params?.conduitTypeFilter;
  const showFreeTryBadge = access === 'locked' || Platform.OS === 'web';

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
    <WebCalcShell title={t('nav.benderSetup')} spacing="md" singleColumnMaxWidth={960}>
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
      <Card style={{ gap: theme.spacing.sm }}>
        <View style={styles.dialInHeader}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.semibold,
            }}
          >
            {t('home.tool.guidedCalibration.name')}
          </Text>
          {showFreeTryBadge ? (
            <Text
              style={[
                styles.freeBadge,
                {
                  color: theme.colors.accentText,
                  backgroundColor: theme.colors.selection,
                  borderColor: theme.colors.accentText,
                },
              ]}
            >
              {t('bender.freeTryBadge')}
            </Text>
          ) : null}
        </View>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            lineHeight: 20,
          }}
        >
          {t('bender.dialInCardBody')}
        </Text>
        <BigButton
          title={t('bender.dialInCta')}
          variant="secondary"
          onPress={() =>
            navigation.navigate('GuidedCalibration', { entrySource: 'bender_screen' })
          }
        />
      </Card>
    </WebCalcShell>
  );
}

const styles = StyleSheet.create({
  dialInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  freeBadge: {
    fontSize: 12,
    fontWeight: '600',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
