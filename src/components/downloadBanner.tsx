import { useState, type ComponentProps, type ComponentType } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  detectClientDevice,
  getDownloadBannerCopy,
  DOWNLOAD_BANNER_DISMISS_DAYS,
  DOWNLOAD_BANNER_DISMISS_KEY,
} from '../lib/downloadBannerCopy';
import { buildGooglePlayUrl } from '../lib/homeContent';
import { isMobileNavViewport, workspaceMaxWidth } from '../seo/calculatorNav';
import { isSeoToolPath } from '../seo/toolPages';
import { logAmplitudeEvent } from '../lib/amplitude';
import { trackEvent } from '../lib/analytics';
import { useTheme } from '../theme';

/** Banner 固定高度；同值用作内容区占位，避免遮挡。 */
export const DOWNLOAD_BANNER_HEIGHT = 48;

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

function resolvePageSlug(): string {
  if (typeof window === 'undefined' || !window.location) {
    return 'home';
  }
  const cleaned = window.location.pathname
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9_-]/g, '_');
  return cleaned || 'home';
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
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(
    () => Platform.OS === 'web' && !isDismissedWithinWindow() && !isSeoRoute(),
  );

  if (Platform.OS !== 'web' || !visible) {
    return null;
  }

  const handleDismiss = () => {
    logAmplitudeEvent('web_banner_dismissed');
    writeDismissedNow();
    setVisible(false);
  };

  const device = detectClientDevice();
  const pageSlug = resolvePageSlug();
  const playUrl = buildGooglePlayUrl({
    source: 'web_seo',
    medium: 'banner',
    campaign: pageSlug,
    content: 'top_banner',
  });
  const bannerCopy = getDownloadBannerCopy(device);
  const mobile = isMobileNavViewport(width);
  const containerMaxWidth = workspaceMaxWidth(width);
  const bannerBg = theme.scheme === 'dark' ? theme.colors.card : '#EFF4F8';
  const mobileTitle = device === 'android'
    ? 'Get Android Offline App'
    : device === 'ios'
      ? 'Add to Home Screen'
      : 'Bookmark for Offline';

  return (
    <>
      <View
        accessibilityRole="header"
        accessibilityLabel={bannerCopy.title}
        pointerEvents="box-none"
        style={[
          styles.banner,
          mobile
            ? {
                backgroundColor: bannerBg,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }
            : {
                backgroundColor: 'transparent',
                paddingHorizontal: 24,
              },
        ]}
      >
        <View
          style={[
            styles.inner,
            !mobile
              ? {
                  maxWidth: containerMaxWidth - 48,
                  paddingHorizontal: 12,
                  backgroundColor: bannerBg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius,
                }
              : null,
          ]}
        >
          <Image
            source={require('../../assets/icon.png')}
            resizeMode="cover"
            style={[styles.appIcon as ImageStyle, { borderRadius: 6 }]}
          />
          <View style={styles.textBlock}>
            {mobile ? (
              <Text
                numberOfLines={1}
                style={[styles.title, { color: theme.colors.textPrimary }]}
              >
                {mobileTitle}
              </Text>
            ) : (
              <Text
                numberOfLines={1}
                style={[styles.title, { color: theme.colors.textPrimary }]}
              >
                {bannerCopy.title}
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '400', fontSize: 13 }}>
                  {` · ${bannerCopy.subtitle}`}
                </Text>
              </Text>
            )}
          </View>
          {device === 'android' ? (
            <AnchorText
              accessibilityRole="link"
              accessibilityLabel="Get the Conduit Bend Calc app on Google Play"
              href={playUrl}
              hrefAttrs={{ target: '_blank', rel: 'noopener noreferrer' }}
              onPress={() => {
                // gtag 同步 push 到 dataLayer，不阻塞 <a> 默认跳转。
                trackEvent('google_play_click', { source: 'banner' });
                logAmplitudeEvent('google_play_cta_clicked', {
                  source: 'download_banner',
                  page_slug: pageSlug,
                  utm_source: 'web_seo',
                  utm_medium: 'banner',
                  utm_campaign: pageSlug,
                  cta_placement: 'top_banner',
                });
              }}
              style={
                [
                  styles.getButton,
                  styles.getText,
                  {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: theme.colors.primaryText,
                    color: theme.colors.primaryText,
                    borderRadius: 999,
                  },
                ] as StyleProp<TextStyle>
              }
            >
              {bannerCopy.button}
            </AnchorText>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Acknowledge offline notice"
              onPress={() => {
                trackEvent('offline_notice_ack', { device });
                handleDismiss();
              }}
              hitSlop={6}
              style={[
                styles.getButton,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: theme.colors.primaryText,
                  borderRadius: 999,
                },
              ]}
            >
              <Text
                style={[
                  styles.getText,
                  { color: theme.colors.primaryText },
                ]}
              >
                {bannerCopy.button}
              </Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss download banner"
            onPress={handleDismiss}
            style={styles.closeButton}
          >
            <Text
              style={[
                styles.closeText,
                { color: theme.colors.textSecondary },
              ]}
            >
              ✕
            </Text>
          </Pressable>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    // 必须压过导航头所在的堆叠上下文：组件挂在 App 根节点，
    // 此处 zIndex 直接参与根堆叠上下文比较。
    zIndex: 1000,
  },
  inner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  appIcon: {
    width: 24,
    height: 24,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  getButton: {
    minWidth: 44,
    minHeight: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    lineHeight: 28,
  },
  getText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
  },
});
