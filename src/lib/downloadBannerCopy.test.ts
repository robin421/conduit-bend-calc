import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DOWNLOAD_BANNER_COPY,
  DOWNLOAD_BANNER_DISMISS_DAYS,
  DOWNLOAD_BANNER_DISMISS_KEY,
} from './downloadBannerCopy.ts';

test('banner copy has non-empty title, subtitle and button', () => {
  assert.ok(DOWNLOAD_BANNER_COPY.title.length > 0);
  assert.ok(DOWNLOAD_BANNER_COPY.subtitle.length > 0);
  assert.ok(DOWNLOAD_BANNER_COPY.button.length > 0);
});

test('dismiss key and window are stable', () => {
  assert.equal(DOWNLOAD_BANNER_DISMISS_KEY, 'cbc_banner_dismissed');
  assert.equal(DOWNLOAD_BANNER_DISMISS_DAYS, 7);
});
