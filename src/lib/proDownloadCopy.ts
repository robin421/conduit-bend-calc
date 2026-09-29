/**
 * Web 下载引导浮层的纯文案（不依赖 react-native，便于单测）。
 * key 对应首页 Pro 入口的 entry.key。
 */

/** 首页 Pro 入口的 key：目前只有两个校准入口。 */
export type ProDownloadEntryKey = 'GuidedCalibration' | 'Calibration';

export interface ProDownloadCopy {
  /** 浮层标题：功能名 */
  title: string;
  /** 一句话价值说明 */
  value: string;
}

export const PRO_DOWNLOAD_COPY: Record<ProDownloadEntryKey, ProDownloadCopy> = {
  GuidedCalibration: {
    title: 'Calibrate My Bender',
    value:
      "One 90° test bend teaches the app your bender's true radius — every offset, stub and saddle then matches your actual bender.",
  },
  Calibration: {
    title: 'Advanced Calibration',
    value: 'Fine-tune gain and take-up manually — for worn heads or benders with no preset.',
  },
};
