import assert from 'node:assert/strict';
import { test } from 'node:test';

import { interactionColors } from './interactionColors.ts';
import { brandPalette } from './brandPalette.ts';

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

test('图标黄底深蓝字在正常和白色按压叠层下达到 4.5:1 对比度', () => {
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

test('图标黄的小字变体在浅色背景上达到 4.5:1', () => {
  const text = luminance(rgb(brandPalette.goldText));
  for (const background of ['#FFFFFF', '#F5F8FB']) {
    const bg = luminance(rgb(background));
    assert.ok((Math.max(text, bg) + 0.05) / (Math.min(text, bg) + 0.05) >= 4.5);
  }
});
