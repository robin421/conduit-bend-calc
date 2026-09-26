import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CalcHomeScreen from '../screens/calcHomeScreen';
import CalculatorPlaceholderScreen from '../screens/calculatorPlaceholderScreen';
import OffsetScreen from '../screens/offsetScreen';

export type CalcStackParamList = {
  CalcHome: undefined;
  Offset: undefined;
  Placeholder: { title: string };
};

const Stack = createNativeStackNavigator<CalcStackParamList>();

export default function CalcStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F2B46' },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen name="CalcHome" component={CalcHomeScreen} options={{ title: 'BendCalc' }} />
      <Stack.Screen name="Offset" component={OffsetScreen} options={{ title: 'Offset Bend' }} />
      <Stack.Screen
        name="Placeholder"
        component={CalculatorPlaceholderScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}
