import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, useWindowDimensions } from 'react-native';

import AppBrandBar from '../components/appBrandBar';
import { useI18n } from '../i18n';
import { isMobileNavViewport } from '../seo/calculatorNav';
import { PRODUCT_NAME } from '../seo/brand';
import type { HistoryParams } from '../lib/historyStore';
import type { ConduitType } from '../lib/profile';
import BenderScreen from '../screens/benderScreen';
import CalcHomeScreen from '../screens/calcHomeScreen';
import CalculatorPlaceholderScreen from '../screens/calculatorPlaceholderScreen';
import CalibrationScreen from '../screens/calibrationScreen';
import ConduitFillScreen from '../screens/conduitFillScreen';
import FourPointSaddleScreen from '../screens/fourPointSaddleScreen';
import GuidedCalibrationScreen from '../screens/guidedCalibrationScreen';
import Kicked90Screen from '../screens/kicked90Screen';
import OffsetScreen from '../screens/offsetScreen';
import PaywallScreen from '../screens/paywallScreen';
import RollingOffsetScreen from '../screens/rollingOffsetScreen';
import StubScreen from '../screens/stubScreen';
import ThreePointSaddleScreen from '../screens/threePointSaddleScreen';
import VoltageDropScreen from '../screens/voltageDropScreen';
import WireSizeScreen from '../screens/wireSizeScreen';
import { useTheme } from '../theme';
import type { ProIntent } from '../lib/proFlow';

export type CalcStackParamList = {
  CalcHome: undefined;
  Offset: { backfill?: HistoryParams } | undefined;
  Stub: { backfill?: HistoryParams } | undefined;
  ThreePointSaddle: { backfill?: HistoryParams } | undefined;
  FourPointSaddle: { backfill?: HistoryParams } | undefined;
  RollingOffset: { backfill?: HistoryParams } | undefined;
  Kicked90: { backfill?: HistoryParams } | undefined;
  ConduitFill: undefined;
  VoltageDrop: undefined;
  WireSize: undefined;
  GuidedCalibration: { entrySource?: string } | undefined;
  Calibration: { entrySource?: string } | undefined;
  Bender: { conduitTypeFilter?: ConduitType; createCustom?: boolean } | undefined;
  Paywall: { triggerSource?: string; intent?: ProIntent; pendingTaskId?: string } | undefined;
  Placeholder: { title: string };
};

const Stack = createNativeStackNavigator<CalcStackParamList>();

export default function CalcStack() {
  const theme = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const hideWebDesktopHeader = isWeb && !isMobileNavViewport(width);
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: !hideWebDesktopHeader,
        animation: isWeb ? 'none' : undefined,
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        headerTitleAlign: 'left',
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '600',
        },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen
        name="CalcHome"
        component={CalcHomeScreen}
        options={{
          title: PRODUCT_NAME,
          headerShown: !hideWebDesktopHeader,
          headerTitle: () => <AppBrandBar tone="header" />,
        }}
      />
      <Stack.Screen name="Offset" component={OffsetScreen} options={{ title: t('home.tool.offset.name') }} />
      <Stack.Screen name="Stub" component={StubScreen} options={{ title: t('home.tool.stub.name') }} />
      <Stack.Screen
        name="ThreePointSaddle"
        component={ThreePointSaddleScreen}
        options={{ title: t('home.tool.saddle3.name') }}
      />
      <Stack.Screen
        name="FourPointSaddle"
        component={FourPointSaddleScreen}
        options={{ title: t('home.tool.saddle4.name') }}
      />
      <Stack.Screen
        name="RollingOffset"
        component={RollingOffsetScreen}
        options={{ title: t('home.tool.rollingOffset.name') }}
      />
      <Stack.Screen
        name="Kicked90"
        component={Kicked90Screen}
        options={{ title: t('home.tool.kicked90.name') }}
      />
      <Stack.Screen name="ConduitFill" component={ConduitFillScreen} options={{ title: t('home.tool.conduitFill.name') }} />
      <Stack.Screen name="VoltageDrop" component={VoltageDropScreen} options={{ title: t('home.tool.voltageDrop.name') }} />
      <Stack.Screen
        name="WireSize"
        component={WireSizeScreen}
        options={{ title: t('home.tool.wireSize.name') }}
      />
      <Stack.Screen
        name="GuidedCalibration"
        component={GuidedCalibrationScreen}
        options={{ title: t('home.tool.guidedCalibration.name') }}
      />
      <Stack.Screen
        name="Calibration"
        component={CalibrationScreen}
        options={{ title: t('nav.fullFingerprint') }}
      />
      <Stack.Screen
        name="Bender"
        component={BenderScreen}
        options={{ title: t('nav.benderSetup') }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ title: PRODUCT_NAME, presentation: 'modal' }}
      />
      <Stack.Screen
        name="Placeholder"
        component={CalculatorPlaceholderScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}
