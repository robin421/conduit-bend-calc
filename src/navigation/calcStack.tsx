import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { HistoryParams } from '../lib/historyStore';
import CalcHomeScreen from '../screens/calcHomeScreen';
import CalculatorPlaceholderScreen from '../screens/calculatorPlaceholderScreen';
import CalibrationScreen from '../screens/calibrationScreen';
import FourPointSaddleScreen from '../screens/fourPointSaddleScreen';
import Kicked90Screen from '../screens/kicked90Screen';
import OffsetScreen from '../screens/offsetScreen';
import RollingOffsetScreen from '../screens/rollingOffsetScreen';
import StubScreen from '../screens/stubScreen';
import ThreePointSaddleScreen from '../screens/threePointSaddleScreen';
import { useTheme } from '../theme';

export type CalcStackParamList = {
  CalcHome: undefined;
  Offset: { backfill?: HistoryParams } | undefined;
  Stub: { backfill?: HistoryParams } | undefined;
  ThreePointSaddle: { backfill?: HistoryParams } | undefined;
  FourPointSaddle: { backfill?: HistoryParams } | undefined;
  RollingOffset: { backfill?: HistoryParams } | undefined;
  Kicked90: { backfill?: HistoryParams } | undefined;
  Calibration: undefined;
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
        name="RollingOffset"
        component={RollingOffsetScreen}
        options={{ title: 'Rolling Offset' }}
      />
      <Stack.Screen
        name="Kicked90"
        component={Kicked90Screen}
        options={{ title: 'Kicked 90°' }}
      />
      <Stack.Screen
        name="Calibration"
        component={CalibrationScreen}
        options={{ title: '试弯校准' }}
      />
      <Stack.Screen
        name="Placeholder"
        component={CalculatorPlaceholderScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}
