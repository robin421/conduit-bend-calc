import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildGooglePlayUrl,
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
  assert.equal(new URL(GOOGLE_PLAY_URL).searchParams.get('id'), 'com.robin421.conduitbendcalc');
});

test('buildGooglePlayUrl：构造带编码 referrer UTM 参数的 Play 商店链接并清洗字符', () => {
  const full = buildGooglePlayUrl({
    source: 'web_seo',
    medium: 'tool_cta',
    campaign: '3-point-saddle',
    content: 'below_result',
  });
  assert.equal(
    full,
    `${GOOGLE_PLAY_URL}&referrer=${encodeURIComponent('utm_source=web_seo&utm_medium=tool_cta&utm_campaign=3-point-saddle&utm_content=below_result')}`,
  );
  const parsed = new URL(full);
  assert.equal(parsed.searchParams.get('id'), 'com.robin421.conduitbendcalc');
  assert.equal(
    parsed.searchParams.get('referrer'),
    'utm_source=web_seo&utm_medium=tool_cta&utm_campaign=3-point-saddle&utm_content=below_result',
  );

  // 缺省字段与非法字符过滤
  const partial = buildGooglePlayUrl({
    source: ' Web_SEO!@# ',
    medium: '   ',
    campaign: 'Stub-Up/2026?',
  });
  assert.equal(
    partial,
    `${GOOGLE_PLAY_URL}&referrer=${encodeURIComponent('utm_source=web_seo&utm_campaign=stub-up2026')}`,
  );

  // 全部为空时退回原 GOOGLE_PLAY_URL
  assert.equal(buildGooglePlayUrl({ source: '!!!' }), GOOGLE_PLAY_URL);
});
