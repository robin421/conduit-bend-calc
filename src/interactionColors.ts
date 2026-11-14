import { brandPalette } from './brandPalette.ts';

/** 图标黄配深蓝字，使用轻量白色按压反馈。 */
export const interactionColors = {
  controlAccent: brandPalette.yellow,
  onControlAccent: brandPalette.navy,
  pressFeedback: 'rgba(255, 255, 255, 0.04)',
} as const;
