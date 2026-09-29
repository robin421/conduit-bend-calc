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
    title: 'Dial In My Bender',
    value:
      'Free calculators are already trade-standard accurate. Dialing in tightens second-order corrections (take-up, gain) to your exact bender — start with the 1-measurement quick check.',
  },
  Calibration: {
    title: 'Full Fingerprint',
    value:
      "Cut 24\u2033 of scrap, bend one 90\u00b0 in the middle, enter both legs — the app derives your bender's true centerline radius.",
  },
};
