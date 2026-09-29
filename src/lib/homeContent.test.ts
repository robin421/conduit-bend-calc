import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  FOUR_POINT_SADDLE_ICON,
  GOOGLE_PLAY_BADGE_ASPECT_RATIO,
  GOOGLE_PLAY_URL,
  THREE_POINT_SADDLE_ICON,
} from './homeContent.ts';

test('saddle 图标使用紧凑的 LOGICAL AND，而不是会溢出图标槽的 N-ARY', () => {
  // U+2227 两个字形能放进 48pt 图标槽；U+22C0 会被截断成省略号。
  assert.equal([...THREE_POINT_SADDLE_ICON].length, 1);
  assert.equal([...FOUR_POINT_SADDLE_ICON].length, 2);
  assert.deepEqual(
    [...FOUR_POINT_SADDLE_ICON].map((c) => c.codePointAt(0)),
    [0x2227, 0x2227],
  );
  assert.ok(!THREE_POINT_SADDLE_ICON.includes('\u22c0'));
  assert.ok(!FOUR_POINT_SADDLE_ICON.includes('\u22c0'));
});

test('Google Play 徽章宽高比与链接保持有效', () => {
  assert.equal(GOOGLE_PLAY_BADGE_ASPECT_RATIO, 646 / 250);
  assert.match(GOOGLE_PLAY_URL, /^https:\/\/play\.google\.com\//);
});
