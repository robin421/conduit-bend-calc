import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import FourPointSaddleToolScreen from '../screens/seoTools/fourPointSaddleToolScreen';
import OffsetToolScreen from '../screens/seoTools/offsetToolScreen';
import ShrinkToolScreen from '../screens/seoTools/shrinkToolScreen';
import StubUpToolScreen from '../screens/seoTools/stubUpToolScreen';
import { useTheme } from '../theme';
import { rootLinking } from './rootLinking';
import RootTabs, { type RootTabParamList } from './rootTabs';

export { rootLinking };

export type RootStackParamList = {
  RootTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  SeoOffset: undefined;
  SeoSaddle4: undefined;
  SeoShrink: undefined;
  SeoStubUp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="RootTabs"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="RootTabs" component={RootTabs} />
      <Stack.Screen name="SeoOffset" component={OffsetToolScreen} />
      <Stack.Screen name="SeoSaddle4" component={FourPointSaddleToolScreen} />
      <Stack.Screen name="SeoShrink" component={ShrinkToolScreen} />
      <Stack.Screen name="SeoStubUp" component={StubUpToolScreen} />
    </Stack.Navigator>
  );
}
