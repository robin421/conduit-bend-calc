import { RouteProp, useRoute } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

export default function CalculatorPlaceholderScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProp<CalcStackParamList, 'Placeholder'>>();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.fontSize.title,
          fontWeight: theme.fontWeight.semibold,
        }}
      >
        {route.params.title}
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
          marginTop: theme.spacing.sm,
        }}
      >
        Coming soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
