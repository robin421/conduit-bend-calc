import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PRO_DOWNLOAD_COPY } from './proDownloadCopy.ts';

test('下载引导文案覆盖两个 Pro 校准入口', () => {
  assert.deepEqual(Object.keys(PRO_DOWNLOAD_COPY).sort(), [
    'Calibration',
    'GuidedCalibration',
  ]);
  for (const copy of Object.values(PRO_DOWNLOAD_COPY)) {
    assert.ok(copy.title.length > 0);
    assert.ok(copy.value.length > 0);
  }
});

test('Dial In My Bender 不 oversell：免费计算本身已是 trade-standard', () => {
  const copy = PRO_DOWNLOAD_COPY.GuidedCalibration;
  assert.equal(copy.title, 'Dial In My Bender');
  assert.match(copy.value, /trade-standard accurate/);
  assert.match(copy.value, /second-order corrections/);
});

test('Full Fingerprint 用 gain 法推导真实 R', () => {
  const copy = PRO_DOWNLOAD_COPY.Calibration;
  assert.equal(copy.title, 'Full Fingerprint');
  assert.match(copy.value, /24/);
  assert.match(copy.value, /centerline radius/);
});
