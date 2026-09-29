import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { Text } from 'react-native';

import HistoryScreen from '../screens/historyScreen';
import LookupScreen from '../screens/lookupScreen';
import { useTheme } from '../theme';
import CalcStack from './calcStack';
import type { CalcStackParamList } from './calcStack';
import { handleCalcTabPress } from './calcTabReset';

export type RootTabParamList = {
  CalcHome: NavigatorScreenParams<CalcStackParamList>;
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
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tab.Screen
        name="CalcHome"
        component={CalcStack}
        options={{ title: 'Calculate', headerShown: false, tabBarIcon: tabIcon('⌐') }}
        listeners={({ navigation }) => ({
          tabPress: (event) => handleCalcTabPress(navigation, event),
        })}
      />
      <Tab.Screen
        name="Lookup"
        component={LookupScreen}
        options={{ title: 'Reference', tabBarIcon: tabIcon('▦') }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'History', tabBarIcon: tabIcon('↺') }}
      />
    </Tab.Navigator>
  );
}
