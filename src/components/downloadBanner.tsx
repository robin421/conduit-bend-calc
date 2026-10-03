import { useState, type ComponentProps, type ComponentType } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  DOWNLOAD_BANNER_COPY,
  DOWNLOAD_BANNER_DISMISS_DAYS,
  DOWNLOAD_BANNER_DISMISS_KEY,
} from '../lib/downloadBannerCopy';
import { GOOGLE_PLAY_URL } from '../lib/homeContent';
import { isSeoToolPath } from '../seo/toolPages';
import { trackEvent } from '../lib/analytics';
import { useTheme } from '../theme';

/** Banner 固定高度；同值用作内容区占位，避免遮挡。 */
export const DOWNLOAD_BANNER_HEIGHT = 60;

/**
 * react-native-web 的 Text 支持 href / hrefAttrs（渲染为 <a>），
 * 但 RN 类型未收录，这里做一次类型扩展断言；Native 端忽略该 prop。
 */
const AnchorText = Text as unknown as ComponentType<
  ComponentProps<typeof Text> & {
    href?: string;
    hrefAttrs?: { target?: string; rel?: string };
  }
>;

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

function isSeoRoute(): boolean {
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }
  return isSeoToolPath(window.location.pathname);
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
 * Web 顶部固定下载 banner：常驻提醒访客下载 App 体验更多功能。
 * 仅在 Web 渲染；Native 端返回 null。
 *
 * SEO 工具页（/offset、/4-point-saddle、/shrink、/stub-up）不展示，
 * 保持工具页纯粹、不挂 "Get the App"（MVP 先验证自然流量）。
 *
 * 挂载位置说明：必须挂在 App 根节点（NavigationContainer 之外），
 * 因为 native-stack 的导航头渲染在屏幕容器之外的同级堆叠上下文里，
 * banner 放在任何屏幕内部都无法用 z-index 压过导航头。
 * 因此 banner 出现在其余 Web 页面顶部（不只首页），这是有意为之。
 */
export default function DownloadBanner() {
  const theme = useTheme();
  const [visible, setVisible] = useState(
    () => Platform.OS === 'web' && !isDismissedWithinWindow() && !isSeoRoute(),
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
        style={[styles.banner, { backgroundColor: theme.colors.accent }]}
      >
        <Image
          source={require('../../assets/icon.png')}
          resizeMode="cover"
          style={styles.appIcon as ImageStyle}
        />
        <View style={styles.textBlock}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: theme.colors.onAccent }]}
          >
            {DOWNLOAD_BANNER_COPY.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.subtitle, { color: theme.colors.onAccent }]}
          >
            {DOWNLOAD_BANNER_COPY.subtitle}
          </Text>
        </View>
        <AnchorText
          accessibilityRole="link"
          accessibilityLabel="Get the Conduit Bend Calc app on Google Play"
          href={GOOGLE_PLAY_URL}
          hrefAttrs={{ target: '_blank', rel: 'noopener noreferrer' }}
          onPress={() => {
            // gtag 同步 push 到 dataLayer，不阻塞 <a> 默认跳转。
            trackEvent('google_play_click', { source: 'banner' });
          }}
          style={
            [
              styles.getButton,
              styles.getText,
              { color: theme.colors.onAccent },
            ] as StyleProp<TextStyle>
          }
        >
          {DOWNLOAD_BANNER_COPY.button}
        </AnchorText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss download banner"
          onPress={handleDismiss}
          style={styles.closeButton}
        >
          <Text style={[styles.closeText, { color: theme.colors.onAccent }]}>
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
    // 必须压过导航头所在的堆叠上下文：组件挂在 App 根节点，
    // 此处 zIndex 直接参与根堆叠上下文比较。
    zIndex: 1000,
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
