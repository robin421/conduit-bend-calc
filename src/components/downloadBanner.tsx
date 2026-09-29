import { useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';

import {
  DOWNLOAD_BANNER_COPY,
  DOWNLOAD_BANNER_DISMISS_DAYS,
  DOWNLOAD_BANNER_DISMISS_KEY,
} from '../lib/downloadBannerCopy';
import { GOOGLE_PLAY_URL } from '../lib/homeContent';
import { useTheme } from '../theme';

/** Banner 固定高度；同值用作内容区占位，避免遮挡。 */
export const DOWNLOAD_BANNER_HEIGHT = 60;

function readDismissedAt(): number | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const raw = window.localStorage.getItem(DOWNLOAD_BANNER_DISMISS_KEY);
    const ts = raw === null ? NaN : Number(raw);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    // 隐私模式等场景 localStorage 访问抛异常：视为未关闭过。
    return null;
  }
}

function writeDismissedNow(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(
      DOWNLOAD_BANNER_DISMISS_KEY,
      String(Date.now()),
    );
  } catch {
    // 写失败就写失败，下次照常展示。
  }
}

function isDismissedWithinWindow(): boolean {
  const ts = readDismissedAt();
  if (ts === null) {
    return false;
  }
  const windowMs = DOWNLOAD_BANNER_DISMISS_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - ts < windowMs;
}

/**
 * Web 首页顶部固定下载 banner：常驻提醒访客下载 App 体验更多功能。
 * 仅在 Web 渲染；Native 端返回 null。显示状态组件内部自管理，
 * 同时渲染等高占位，保证下方内容不被 fixed banner 遮挡。
 */
export default function DownloadBanner() {
  const theme = useTheme();
  const [visible, setVisible] = useState(
    () => Platform.OS === 'web' && !isDismissedWithinWindow(),
  );

  if (Platform.OS !== 'web' || !visible) {
    return null;
  }

  const handleDismiss = () => {
    writeDismissedNow();
    setVisible(false);
  };

  return (
    <>
      <View
        accessibilityRole="header"
        accessibilityLabel="Download the Conduit Bend Calc app"
        style={[styles.banner, { backgroundColor: theme.colors.primary }]}
      >
        <Image
          source={require('../../assets/icon.png')}
          resizeMode="cover"
          style={styles.appIcon as ImageStyle}
        />
        <View style={styles.textBlock}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: theme.colors.onPrimary }]}
          >
            {DOWNLOAD_BANNER_COPY.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.subtitle, { color: theme.colors.resultLabel }]}
          >
            {DOWNLOAD_BANNER_COPY.subtitle}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Get the Conduit Bend Calc app on Google Play"
          onPress={() => {
            void Linking.openURL(GOOGLE_PLAY_URL).catch(() => undefined);
          }}
          style={styles.getButton}
        >
          <Text style={[styles.getText, { color: theme.colors.primary }]}>
            {DOWNLOAD_BANNER_COPY.button}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss download banner"
          onPress={handleDismiss}
          style={styles.closeButton}
        >
          <Text style={[styles.closeText, { color: theme.colors.onPrimary }]}>
            ✕
          </Text>
        </Pressable>
      </View>
      {/* 内容区占位：与 fixed banner 等高 */}
      <View style={{ height: DOWNLOAD_BANNER_HEIGHT }} />
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    // react-native-web 支持 fixed（RN 类型未收录，此处断言）
    position: 'fixed' as unknown as ViewStyle['position'],
    top: 0,
    left: 0,
    right: 0,
    height: DOWNLOAD_BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    zIndex: 10,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  getButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  getText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
  },
});
