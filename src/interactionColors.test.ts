import assert from 'node:assert/strict';
import { test } from 'node:test';

import { interactionColors } from './interactionColors.ts';

function rgb(hex: string): number[] {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}

function luminance(channels: number[]): number {
  const [r, g, b] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

test('白色控件文字在选中和白色按压叠层下仍达到 4.5:1 对比度', () => {
  const foreground = luminance(rgb(interactionColors.onControlAccent));
  const overlay = interactionColors.pressFeedback.match(/[\d.]+/g)!.map(Number);
  const alpha = overlay[3];
  const background = rgb(interactionColors.controlAccent);
  const pressed = background.map((channel, index) => channel * (1 - alpha) + overlay[index] * alpha);
  for (const surface of [background, pressed]) {
    const bg = luminance(surface);
    const contrast = (Math.max(foreground, bg) + 0.05) / (Math.min(foreground, bg) + 0.05);
    assert.ok(contrast >= 4.5, `contrast ${contrast.toFixed(2)} must be >= 4.5`);
  }
});
