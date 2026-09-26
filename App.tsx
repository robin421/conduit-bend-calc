import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootTabs from './src/navigation/rootTabs';
import { getNavigationTheme, useTheme } from './src/theme';

export default function App() {
  const theme = useTheme();
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={getNavigationTheme(theme)}>
        <RootTabs />
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
