import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import BigButton from '../components/bigButton';
import Card from '../components/card';
import ProDownloadSheet from '../components/proDownloadSheet';
import {
  FOUR_POINT_SADDLE_ICON,
  THREE_POINT_SADDLE_ICON,
} from '../lib/homeContent';
import type { ProDownloadEntryKey } from '../lib/proDownloadCopy';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';
import { useProAccess } from '../lib/proStore';
import { useUnitSystem } from '../lib/unitStore';
import { trackEvent } from '../lib/analytics';
import { logFirebaseUnitSystemChanged } from '../lib/firebase';
import type { UnitSystem } from '../lib/units';

type Props = NativeStackScreenProps<CalcStackParamList, 'CalcHome'>;

interface CalculatorEntry {
  key: keyof CalcStackParamList;
  icon: string;
  name: string;
  description: string;
  /** Pro 功能：未购买时点击进付费墙（仅校准类，计算器不再 gate）。 */
  pro?: boolean;
}

const ENTRIES: CalculatorEntry[] = [
  { key: 'Offset', icon: '⌐', name: 'Offset Bend', description: 'Offset: mark spacing & shrink' },
  { key: 'Stub', icon: '∟', name: '90° Stub', description: 'Stub-up: mark location' },
  { key: 'ThreePointSaddle', icon: THREE_POINT_SADDLE_ICON, name: '3-Point Saddle', description: '3-point saddle' },
  { key: 'FourPointSaddle', icon: FOUR_POINT_SADDLE_ICON, name: '4-Point Saddle', description: '4-point saddle' },
  { key: 'RollingOffset', icon: '⤢', name: 'Rolling Offset', description: 'Rolling offset: rise & roll' },
  { key: 'Kicked90', icon: '∠', name: 'Kicked 90°', description: 'Kicked 90°: 90° + kick combo' },
  { key: 'GuidedCalibration', icon: '◎', name: 'Dial In My Bender', description: 'Quick check or full fingerprint — match the app to your bender', pro: true },
  { key: 'Calibration', icon: '⌁', name: 'Full Fingerprint', description: "Gain method: derive your bender's true radius", pro: true },
];

export default function CalcHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { unit, setUnit } = useUnitSystem();
  const { access } = useProAccess();
  const [sheetEntryKey, setSheetEntryKey] = useState<ProDownloadEntryKey | null>(null);

  const handleUnitChange = (next: UnitSystem) => {
    if (next !== unit) {
      trackEvent('unit_changed', { unit: next });
      logFirebaseUnitSystemChanged(unit, next);
    }
    setUnit(next);
  };

  const handlePress = (entry: CalculatorEntry) => {
    if (entry.pro) {
      trackEvent('calibration_cta_click', {
        source:
          entry.key === 'GuidedCalibration'
            ? 'guided_calibration'
            : 'advanced_calibration',
      });
    }
    // Web 没有 IAP：Pro 入口点击弹出下载引导，导流到 Google Play。
    if (entry.pro && Platform.OS === 'web') {
      setSheetEntryKey(entry.key as ProDownloadEntryKey);
      return;
    }
    if (entry.pro && access === 'locked') {
      navigation.navigate('Paywall');
      return;
    }
    if (entry.key === 'Offset') {
      navigation.navigate('Offset');
    } else if (entry.key === 'Stub') {
      navigation.navigate('Stub');
    } else if (entry.key === 'ThreePointSaddle') {
      navigation.navigate('ThreePointSaddle');
    } else if (entry.key === 'FourPointSaddle') {
      navigation.navigate('FourPointSaddle');
    } else if (entry.key === 'RollingOffset') {
      navigation.navigate('RollingOffset');
    } else if (entry.key === 'Kicked90') {
      navigation.navigate('Kicked90');
    } else if (entry.key === 'GuidedCalibration') {
      navigation.navigate('GuidedCalibration');
    } else if (entry.key === 'Calibration') {
      navigation.navigate('Calibration');
    } else {
      navigation.navigate('Placeholder', { title: entry.name });
    }
  };

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[
          styles.content,
          { padding: theme.spacing.md, gap: theme.spacing.md },
        ]}
      >
      <View style={styles.unitRow}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
          }}
        >
          Units
        </Text>
        <View style={[styles.unitToggle, { gap: theme.spacing.xs }]}>
          <BigButton
            title="Fraction"
            size="selection"
            selected={unit === 'fractional'}
            onPress={() => handleUnitChange('fractional')}
            style={styles.unitButton}
          />
          <BigButton
            title="Decimal"
            size="selection"
            selected={unit === 'decimal'}
            onPress={() => handleUnitChange('decimal')}
            style={styles.unitButton}
          />
          <BigButton
            title="Metric"
            size="selection"
            selected={unit === 'metric'}
            onPress={() => handleUnitChange('metric')}
            style={styles.unitButton}
          />
        </View>
      </View>

      {ENTRIES.map((entry) => (
        <Pressable
          key={entry.key}
          accessibilityRole="button"
          onPress={() => handlePress(entry)}
          android_ripple={{ color: theme.colors.border }}
        >
          <Card style={styles.card}>
            <View
              style={[
                styles.accentBar,
                {
                  backgroundColor: theme.colors.accent,
                  marginRight: theme.spacing.sm,
                  borderRadius: 2,
                },
              ]}
            />
            <Text
              numberOfLines={1}
              style={[styles.icon, { color: theme.colors.primaryText }]}
            >
              {entry.icon}
            </Text>
            <View style={styles.textBlock}>
              <View style={styles.nameRow}>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: theme.fontSize.body,
                    fontWeight: theme.fontWeight.semibold,
                  }}
                >
                  {entry.name}
                </Text>
                {entry.pro && (access === 'locked' || Platform.OS === 'web') ? (
                  <Text
                    style={[
                      styles.proPill,
                      {
                        backgroundColor: theme.colors.accent,
                        color: theme.colors.onAccent,
                        marginLeft: theme.spacing.xs,
                      },
                    ]}
                  >
                    PRO
                  </Text>
                ) : null}
              </View>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.secondary,
                  marginTop: theme.spacing.xs,
                }}
              >
                {entry.description}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: theme.colors.textSecondary }]}>›</Text>
          </Card>
        </Pressable>
      ))}
      </ScrollView>
      <ProDownloadSheet
        entryKey={sheetEntryKey}
        onClose={() => setSheetEntryKey(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },
  proPill: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    height: 40,
    flexShrink: 0,
  },
  icon: {
    fontSize: 28,
    width: 48,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    fontSize: 28,
    marginLeft: 8,
  },
  unitRow: {
    gap: 8,
  },
  unitToggle: {
    flexDirection: 'row',
  },
  unitButton: {
    flex: 1,
  },
});
