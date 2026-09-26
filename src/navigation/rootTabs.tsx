import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HistoryScreen from '../screens/historyScreen';
import LookupScreen from '../screens/lookupScreen';
import CalcStack from './calcStack';

export type RootTabParamList = {
  CalcHome: undefined;
  Lookup: undefined;
  History: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function tabIcon(glyph: string) {
  return function TabIcon({ color }: { color: string }) {
    return <Text style={{ color, fontSize: 20 }}>{glyph}</Text>;
  };
}

export default function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F2B46' },
        headerTintColor: '#FFFFFF',
        tabBarActiveTintColor: '#0F2B46',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tab.Screen
        name="CalcHome"
        component={CalcStack}
        options={{ title: '计算', headerShown: false, tabBarIcon: tabIcon('⌐') }}
      />
      <Tab.Screen
        name="Lookup"
        component={LookupScreen}
        options={{ title: '速查表', tabBarIcon: tabIcon('▦') }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: '历史', tabBarIcon: tabIcon('↺') }}
      />
    </Tab.Navigator>
  );
}
