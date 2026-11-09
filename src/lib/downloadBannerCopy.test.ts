import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectClientDevice,
  DOWNLOAD_BANNER_COPY,
  DOWNLOAD_BANNER_COPY_DESKTOP,
  DOWNLOAD_BANNER_COPY_IOS,
  DOWNLOAD_BANNER_DISMISS_DAYS,
  DOWNLOAD_BANNER_DISMISS_KEY,
  getDownloadBannerCopy,
} from './downloadBannerCopy.ts';

test('banner copy has non-empty title, subtitle and button across devices', () => {
  for (const copy of [DOWNLOAD_BANNER_COPY, DOWNLOAD_BANNER_COPY_IOS, DOWNLOAD_BANNER_COPY_DESKTOP]) {
    assert.ok(copy.title.length > 0);
    assert.ok(copy.subtitle.length > 0);
    assert.ok(copy.button.length > 0);
  }
});

test('detectClientDevice recognizes android, ios and desktop', () => {
  assert.equal(detectClientDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'android');
  assert.equal(detectClientDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'ios');
  assert.equal(detectClientDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'desktop');
  assert.equal(detectClientDevice(''), 'desktop');
});

test('getDownloadBannerCopy returns correct copy for device', () => {
  assert.equal(getDownloadBannerCopy('android').button, 'GET APP');
  assert.equal(getDownloadBannerCopy('ios').button, 'GOT IT');
  assert.equal(getDownloadBannerCopy('desktop').button, 'GOT IT');
});

test('dismiss key and window are stable', () => {
  assert.equal(DOWNLOAD_BANNER_DISMISS_KEY, 'cbc_banner_dismissed');
  assert.equal(DOWNLOAD_BANNER_DISMISS_DAYS, 7);
});
