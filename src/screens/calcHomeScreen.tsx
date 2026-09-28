import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Card from '../components/card';
import { useProAccess } from '../lib/proStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'CalcHome'>;

interface CalculatorEntry {
  key: keyof CalcStackParamList;
  icon: string;
  name: string;
  description: string;
  /** Pro 功能：未购买时锁定，点击进入付费墙。 */
  pro?: boolean;
}

const ENTRIES: CalculatorEntry[] = [
  { key: 'Offset', icon: '⌐', name: 'Offset Bend', description: 'Offset: mark spacing & shrink' },
  { key: 'Stub', icon: '∟', name: '90° Stub', description: 'Stub-up: mark location' },
  { key: 'ThreePointSaddle', icon: '⋀', name: '3-Point Saddle', description: '3-point saddle', pro: true },
  { key: 'FourPointSaddle', icon: '⋀⋀', name: '4-Point Saddle', description: '4-point saddle', pro: true },
  { key: 'RollingOffset', icon: '⤢', name: 'Rolling Offset', description: 'Rolling offset: rise & roll', pro: true },
  { key: 'Kicked90', icon: '∠', name: 'Kicked 90°', description: 'Kicked 90°: 90° + kick combo', pro: true },
  { key: 'Calibration', icon: '◎', name: 'Calibration', description: 'One test bend: calibrate R / take-up' },
];

export default function CalcHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { access } = useProAccess();

  const handlePress = (entry: CalculatorEntry) => {
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
    } else if (entry.key === 'Calibration') {
      navigation.navigate('Calibration');
    } else {
      navigation.navigate('Placeholder', { title: entry.name });
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { padding: theme.spacing.md, gap: theme.spacing.md },
      ]}
    >
      {ENTRIES.map((entry, index) => (
        <Pressable
          key={`${entry.name}-${index}`}
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
              style={[styles.icon, { color: theme.colors.primary }]}
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
                {entry.pro && access === 'locked' ? (
                  <Text
                    style={{
                      color: theme.colors.accent,
                      fontSize: theme.fontSize.secondary,
                      fontWeight: theme.fontWeight.semibold,
                      marginLeft: theme.spacing.xs,
                    }}
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
});
