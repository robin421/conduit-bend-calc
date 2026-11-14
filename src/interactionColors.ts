import { brandPalette } from './brandPalette.ts';

/** 图标黄配深蓝字，保留白色按压反馈。 */
export const interactionColors = {
  controlAccent: brandPalette.yellow,
  onControlAccent: brandPalette.navy,
  pressFeedback: 'rgba(255, 255, 255, 0.08)',
} as const;
