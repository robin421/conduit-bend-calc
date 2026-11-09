import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { Platform, Text, View } from 'react-native';

import HistoryScreen from '../screens/historyScreen';
import LookupScreen from '../screens/lookupScreen';
import { Theme, useTheme } from '../theme';
import CalcStack from './calcStack';
import type { CalcStackParamList } from './calcStack';
import { handleCalcTabPress } from './calcTabReset';

export type RootTabParamList = {
  CalcHome: NavigatorScreenParams<CalcStackParamList>;
  Lookup: undefined;
  History: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function tabIcon(glyph: string, theme: Theme) {
  return function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    if (Platform.OS === 'android') {
      const pillBg = focused
        ? theme.scheme === 'dark'
          ? 'rgba(255, 133, 51, 0.22)'
          : 'rgba(255, 107, 0, 0.12)'
        : 'transparent';

      return (
        <View
          style={{
            width: 64,
            height: 32,
            borderRadius: 16,
            backgroundColor: pillBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              color,
              fontSize: 20,
              lineHeight: 22,
              textAlign: 'center',
              includeFontPadding: false,
            }}
          >
            {glyph}
          </Text>
        </View>
      );
    }

    return (
      <Text
        style={{
          color,
          fontSize: 22,
          lineHeight: 24,
          textAlign: 'center',
          includeFontPadding: false,
        }}
      >
        {glyph}
      </Text>
    );
  };
}

export default function RootTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        headerTitleAlign: 'left',
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '600',
        },
        tabBarActiveTintColor: theme.colors.accentText,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: Platform.OS === 'android' ? 80 : 56,
          paddingBottom: Platform.OS === 'android' ? 12 : 6,
          paddingTop: Platform.OS === 'android' ? 10 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tab.Screen
        name="CalcHome"
        component={CalcStack}
        options={{ title: 'Calculate', headerShown: false, tabBarIcon: tabIcon('⌐', theme) }}
        listeners={({ navigation }) => ({
          tabPress: (event) => handleCalcTabPress(navigation, event),
        })}
      />
      <Tab.Screen
        name="Lookup"
        component={LookupScreen}
        options={{ title: 'Reference', tabBarIcon: tabIcon('▦', theme) }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'History', tabBarIcon: tabIcon('↺', theme) }}
      />
    </Tab.Navigator>
  );
}
