import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { applyWebDocumentTitle } from './src/lib/documentTitle';
import { initFirebase, logFirebaseScreenView } from './src/lib/firebase';
import { initProIap } from './src/lib/proStore';
import DownloadBanner from './src/components/downloadBanner';
import RootTabs, { type RootTabParamList } from './src/navigation/rootTabs';
import { getNavigationTheme, useTheme } from './src/theme';

export default function App() {
  const theme = useTheme();
  const navigationRef = useNavigationContainerRef<RootTabParamList>();
  const currentRouteRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    // Pro 内购初始化：fire-and-forget，内部 fail-closed（未验证购买一律 locked），异常直接吞掉。
    initProIap().catch(() => undefined);
    // Firebase 初始化：首屏渲染后执行，避免拖慢冷启动；dev 下 Crashlytics 关闭。
    initFirebase();
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
        ref={navigationRef}
        theme={getNavigationTheme(theme)}
        documentTitle={{ enabled: false }}
        onReady={() => {
          currentRouteRef.current = navigationRef.getCurrentRoute()?.name;
          if (currentRouteRef.current) {
            logFirebaseScreenView(currentRouteRef.current);
          }
        }}
        onStateChange={() => {
          const next = navigationRef.getCurrentRoute()?.name;
          if (next && next !== currentRouteRef.current) {
            currentRouteRef.current = next;
            logFirebaseScreenView(next);
          }
        }}
      >
        <RootTabs />
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
