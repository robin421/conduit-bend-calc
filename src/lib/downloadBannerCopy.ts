/**
 * Web 固定下载 banner 的纯文案与持久化常量（不依赖 react-native，便于单测）。
 */

/** 下载 banner 文案 */
export interface DownloadBannerCopy {
  /** 主标题 */
  title: string;
  /** 副标题：一句话卖点 */
  subtitle: string;
  /** CTA 按钮文字 */
  button: string;
}

/** Android 移动设备：强调 Google Play 离线版与配电房断网秒算 */
export const DOWNLOAD_BANNER_COPY: DownloadBannerCopy = {
  title: 'Conduit Bend Calc for Android',
  subtitle: 'Zero signal? Works 100% offline in electrical rooms & basements',
  button: 'GET APP',
};

/** iOS 移动设备：引导添加到主屏幕作为离线 Web App 使用 */
export const DOWNLOAD_BANNER_COPY_IOS: DownloadBannerCopy = {
  title: 'Offline Calculator on iOS',
  subtitle: 'Tap Share ⎋ → "Add to Home Screen" to use offline on job sites',
  button: 'GOT IT',
};

/** 桌面端：引导按快捷键加入书签离线使用 */
export const DOWNLOAD_BANNER_COPY_DESKTOP: DownloadBannerCopy = {
  title: 'Conduit Bend Calc',
  subtitle: 'Press Cmd+D / Ctrl+D to bookmark. Fully works offline on job sites',
  button: 'GOT IT',
};

export type ClientDeviceType = 'android' | 'ios' | 'desktop';

/** 根据 userAgent 判定当前访客设备类型 */
export function detectClientDevice(userAgent?: string): ClientDeviceType {
  const ua = (
    userAgent ||
    (typeof navigator !== 'undefined' ? navigator.userAgent : '') ||
    ''
  ).toLowerCase();
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'desktop';
}

/** 获取对应设备类型的横幅文案 */
export function getDownloadBannerCopy(device: ClientDeviceType): DownloadBannerCopy {
  switch (device) {
    case 'android':
      return DOWNLOAD_BANNER_COPY;
    case 'ios':
      return DOWNLOAD_BANNER_COPY_IOS;
    case 'desktop':
      return DOWNLOAD_BANNER_COPY_DESKTOP;
  }
}

/** 关闭后写入 localStorage 的 key：存关闭时间戳 */
export const DOWNLOAD_BANNER_DISMISS_KEY = 'cbc_banner_dismissed';

/** 关闭后多少天内不再展示 */
export const DOWNLOAD_BANNER_DISMISS_DAYS = 7;
