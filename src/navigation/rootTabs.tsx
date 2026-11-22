import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  getFocusedRouteNameFromRoute,
  useNavigation,
  type NavigationProp,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import { useState, type ComponentType } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppBrandBar from '../components/appBrandBar';
import {
  CalculateIcon,
  HistoryIcon,
  ReferenceIcon,
  type IconProps,
} from '../components/toolIcons';
import { useI18n, type TranslationKey } from '../i18n';
import HistoryScreen from '../screens/historyScreen';
import LookupScreen from '../screens/lookupScreen';
import { isMobileNavViewport, workspaceMaxWidth } from '../seo/calculatorNav';
import { Theme, useTheme } from '../theme';
import CalcStack from './calcStack';
import type { CalcStackParamList } from './calcStack';
import { handleCalcTabPress } from './calcTabReset';
import type { RootStackParamList } from './rootStackTypes';

export type RootTabParamList = {
  CalcHome: NavigatorScreenParams<CalcStackParamList>;
  Lookup: undefined;
  History: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const DESKTOP_TAB_ITEMS: ReadonlyArray<{
  key: keyof RootTabParamList;
  labelKey: TranslationKey;
}> = [
  { key: 'CalcHome', labelKey: 'tabs.calculate' },
  { key: 'Lookup', labelKey: 'tabs.reference' },
  { key: 'History', labelKey: 'tabs.history' },
];

function tabIcon(IconComponent: ComponentType<IconProps>, theme: Theme) {
  return function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    if (Platform.OS === 'android') {
      const pillBg = focused ? theme.colors.controlAccent : 'transparent';

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
          <IconComponent
            size={20}
            color={focused ? theme.colors.onControlAccent : color}
          />
        </View>
      );
    }

    return <IconComponent size={22} color={color} />;
  };
}

export default function RootTabs() {
  const theme = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<keyof RootTabParamList>('CalcHome');

  const isWeb = Platform.OS === 'web';
  const mobileNav = isMobileNavViewport(width);
  const desktopWebNav = isWeb && !mobileNav;
  const maxWidth = workspaceMaxWidth(width);

  const handleDesktopSelect = (tabKey: keyof RootTabParamList) => {
    setActiveTab(tabKey);
    if (tabKey === 'CalcHome') {
      rootNavigation.navigate('RootTabs', {
        screen: 'CalcHome',
        params: { screen: 'CalcHome' },
      });
      return;
    }
    rootNavigation.navigate('RootTabs', { screen: tabKey });
  };

  const tabNavigator = (
    <Tab.Navigator
      tabBar={desktopWebNav ? () => null : undefined}
      screenListeners={{
        state: (event) => {
          const state = event.data?.state;
          const current = state?.routes?.[state.index]?.name as
            | keyof RootTabParamList
            | undefined;
          if (current) {
            setActiveTab(current);
          }
        },
      }}
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
        tabBarStyle: desktopWebNav
          ? { display: 'none' }
          : {
              backgroundColor: theme.colors.card,
              borderTopColor: theme.colors.border,
              height:
                Platform.OS === 'android'
                  ? 80
                  : isWeb
                    ? 66 + insets.bottom
                    : 56,
              paddingBottom:
                Platform.OS === 'android'
                  ? 12
                  : Math.max(6, isWeb ? insets.bottom : 6),
              paddingTop: Platform.OS === 'android' ? 10 : isWeb ? 4 : 6,
            },
        tabBarItemStyle: isWeb
          ? { justifyContent: 'center', alignItems: 'center', paddingVertical: 2, height: 54 }
          : undefined,
        tabBarIconStyle: isWeb
          ? { width: 22, height: 22, marginTop: 0, marginBottom: 2 }
          : undefined,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.3,
          lineHeight: 14,
          marginBottom: isWeb ? 2 : 0,
        },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tab.Screen
        name="CalcHome"
        component={CalcStack}
        options={({ route }) => ({
          title: t('tabs.calculate'),
          headerShown: false,
          tabBarIcon: tabIcon(CalculateIcon, theme),
          ...(getFocusedRouteNameFromRoute(route) === 'Paywall'
            ? { tabBarStyle: { display: 'none' as const } }
            : {}),
        })}
        listeners={({ navigation }) => ({
          tabPress: (event) => handleCalcTabPress(navigation, event),
        })}
      />
      <Tab.Screen
        name="Lookup"
        component={LookupScreen}
        options={{
          title: t('tabs.reference'),
          headerShown: !desktopWebNav,
          tabBarIcon: tabIcon(ReferenceIcon, theme),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: t('tabs.history'),
          headerShown: !desktopWebNav,
          tabBarIcon: tabIcon(HistoryIcon, theme),
        }}
      />
    </Tab.Navigator>
  );

  if (!desktopWebNav) {
    return tabNavigator;
  }

  return (
    <View style={styles.webRoot}>
      <View
        accessibilityRole="header"
        style={[styles.topNavBar, { backgroundColor: theme.colors.primary }]}
      >
        <View style={[styles.topNavInner, { maxWidth }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => handleDesktopSelect('CalcHome')}
            style={(state) => {
              const { focused } = state as { focused?: boolean };
              return [
                styles.brandTrigger,
                focused
                  ? ({
                      outlineStyle: 'solid',
                      outlineWidth: 2,
                      outlineColor: theme.colors.accent,
                    } as object)
                  : null,
              ];
            }}
          >
            <AppBrandBar tone="header" />
          </Pressable>
          <View style={styles.topNavLinks}>
            {DESKTOP_TAB_ITEMS.map((item) => {
              const selected = activeTab === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => handleDesktopSelect(item.key)}
                  style={(state) => {
                    const { hovered, focused } = state as {
                      hovered?: boolean;
                      focused?: boolean;
                    };
                    return [
                      styles.topNavItem,
                      hovered
                        ? { backgroundColor: 'rgba(255,255,255,0.08)' }
                        : null,
                      focused
                        ? ({
                            outlineStyle: 'solid',
                            outlineWidth: 2,
                            outlineColor: theme.colors.accent,
                          } as object)
                        : null,
                    ];
                  }}
                >
                  <Text
                    style={{
                      color: selected
                        ? theme.colors.onPrimary
                        : 'rgba(255,255,255,0.78)',
                      fontSize: 15,
                      fontWeight: selected ? '600' : '500',
                    }}
                  >
                    {t(item.labelKey)}
                  </Text>
                  {selected ? (
                    <View
                      style={[
                        styles.topNavIndicator,
                        { backgroundColor: theme.colors.accent },
                      ]}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <View style={styles.webContent}>{tabNavigator}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
  },
  webContent: {
    flex: 1,
  },
  topNavBar: {
    height: 56,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  brandTrigger: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  topNavLinks: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
    gap: 8,
  },
  topNavItem: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 8,
  },
  topNavIndicator: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
    height: 3,
  },
});
