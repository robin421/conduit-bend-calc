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

export const DOWNLOAD_BANNER_COPY: DownloadBannerCopy = {
  title: 'Conduit Bend Calc App',
  subtitle: 'Pro bender calibration, offline mode & more',
  button: 'GET',
};

/** 关闭后写入 localStorage 的 key：存关闭时间戳 */
export const DOWNLOAD_BANNER_DISMISS_KEY = 'cbc_banner_dismissed';

/** 关闭后多少天内不再展示 */
export const DOWNLOAD_BANNER_DISMISS_DAYS = 7;
