import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { HistoryParams } from '../lib/historyStore';
import CalcHomeScreen from '../screens/calcHomeScreen';
import CalculatorPlaceholderScreen from '../screens/calculatorPlaceholderScreen';
import FourPointSaddleScreen from '../screens/fourPointSaddleScreen';
import OffsetScreen from '../screens/offsetScreen';
import StubScreen from '../screens/stubScreen';
import ThreePointSaddleScreen from '../screens/threePointSaddleScreen';
import { useTheme } from '../theme';

export type CalcStackParamList = {
  CalcHome: undefined;
  Offset: { backfill?: HistoryParams } | undefined;
  Stub: { backfill?: HistoryParams } | undefined;
  ThreePointSaddle: { backfill?: HistoryParams } | undefined;
  FourPointSaddle: { backfill?: HistoryParams } | undefined;
  Placeholder: { title: string };
};

const Stack = createNativeStackNavigator<CalcStackParamList>();

export default function CalcStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="CalcHome" component={CalcHomeScreen} options={{ title: 'BendCalc' }} />
      <Stack.Screen name="Offset" component={OffsetScreen} options={{ title: 'Offset Bend' }} />
      <Stack.Screen name="Stub" component={StubScreen} options={{ title: '90° Stub' }} />
      <Stack.Screen
        name="ThreePointSaddle"
        component={ThreePointSaddleScreen}
        options={{ title: '3-Point Saddle' }}
      />
      <Stack.Screen
        name="FourPointSaddle"
        component={FourPointSaddleScreen}
        options={{ title: '4-Point Saddle' }}
      />
      <Stack.Screen
        name="Placeholder"
        component={CalculatorPlaceholderScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}
