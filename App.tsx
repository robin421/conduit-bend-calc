import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { applyWebDocumentTitle } from './src/lib/documentTitle';
import { initProIap } from './src/lib/proStore';
import DownloadBanner from './src/components/downloadBanner';
import RootTabs from './src/navigation/rootTabs';
import { getNavigationTheme, useTheme } from './src/theme';

export default function App() {
  const theme = useTheme();
  useEffect(() => {
    // Pro 内购初始化：fire-and-forget，内部已 fail-open，异常直接吞掉。
    initProIap().catch(() => undefined);
    // Web 端固定 SEO 标题；Native 端不受影响。
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      applyWebDocumentTitle(true, document);
    }
  }, []);
  return (
    <SafeAreaProvider>
      {/* Web 固定下载 banner：挂在导航之外才能压过导航头；Native 不渲染 */}
      <DownloadBanner />
      <NavigationContainer
        theme={getNavigationTheme(theme)}
        documentTitle={{ enabled: false }}
      >
        <RootTabs />
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
