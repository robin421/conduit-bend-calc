import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initProIap } from './src/lib/proStore';
import RootTabs from './src/navigation/rootTabs';
import { getNavigationTheme, useTheme } from './src/theme';

export default function App() {
  const theme = useTheme();
  useEffect(() => {
    // Pro 内购初始化：fire-and-forget，内部已 fail-open，异常直接吞掉。
    initProIap().catch(() => undefined);
  }, []);
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={getNavigationTheme(theme)}>
        <RootTabs />
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
