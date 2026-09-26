import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Card from '../components/card';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'CalcHome'>;

interface CalculatorEntry {
  key: keyof CalcStackParamList;
  icon: string;
  name: string;
  description: string;
}

const ENTRIES: CalculatorEntry[] = [
  { key: 'Offset', icon: '⌐', name: 'Offset Bend', description: '偏移弯：间距与 shrink' },
  { key: 'Stub', icon: '∟', name: '90° Stub', description: '直角弯：标记点位置' },
  { key: 'Placeholder', icon: '⋀⋀', name: '3-Point Saddle', description: '三点马鞍弯' },
  { key: 'Placeholder', icon: '⋀⋀⋀', name: '4-Point Saddle', description: '四点马鞍弯' },
];

export default function CalcHomeScreen({ navigation }: Props) {
  const theme = useTheme();

  const handlePress = (entry: CalculatorEntry) => {
    if (entry.key === 'Offset') {
      navigation.navigate('Offset');
    } else if (entry.key === 'Stub') {
      navigation.navigate('Stub');
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
            <Text style={[styles.icon, { color: theme.colors.primary }]}>{entry.icon}</Text>
            <View style={styles.textBlock}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.fontSize.body,
                  fontWeight: theme.fontWeight.semibold,
                }}
              >
                {entry.name}
              </Text>
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
  },
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
    width: 44,
  },
  textBlock: {
    flex: 1,
  },
  chevron: {
    fontSize: 28,
    marginLeft: 8,
  },
});
