import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ConduitFillToolScreen from '../screens/seoTools/conduitFillToolScreen';
import FourPointSaddleToolScreen from '../screens/seoTools/fourPointSaddleToolScreen';
import Kicked90ToolScreen from '../screens/seoTools/kicked90ToolScreen';
import OffsetToolScreen from '../screens/seoTools/offsetToolScreen';
import RollingOffsetToolScreen from '../screens/seoTools/rollingOffsetToolScreen';
import ShrinkToolScreen from '../screens/seoTools/shrinkToolScreen';
import StubUpToolScreen from '../screens/seoTools/stubUpToolScreen';
import ThreePointSaddleToolScreen from '../screens/seoTools/threePointSaddleToolScreen';
import VoltageDropToolScreen from '../screens/seoTools/voltageDropToolScreen';
import WireSizeToolScreen from '../screens/seoTools/wireSizeToolScreen';
import FeedbackScreen from '../screens/feedbackScreen';
import { useTheme } from '../theme';
import { rootLinking } from './rootLinking';
import type { RootStackParamList } from './rootStackTypes';
import RootTabs from './rootTabs';

export { rootLinking };
export type { RootStackParamList };

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
      <Stack.Screen name="SeoStubUp" component={StubUpToolScreen} />
      <Stack.Screen name="SeoSaddle3" component={ThreePointSaddleToolScreen} />
      <Stack.Screen name="SeoConduitFill" component={ConduitFillToolScreen} />
      <Stack.Screen name="SeoSaddle4" component={FourPointSaddleToolScreen} />
      <Stack.Screen name="SeoShrink" component={ShrinkToolScreen} />
      <Stack.Screen name="SeoRollingOffset" component={RollingOffsetToolScreen} />
      <Stack.Screen name="SeoKicked90" component={Kicked90ToolScreen} />
      <Stack.Screen name="SeoWireSize" component={WireSizeToolScreen} />
      <Stack.Screen name="SeoVoltageDrop" component={VoltageDropToolScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
    </Stack.Navigator>
  );
}
