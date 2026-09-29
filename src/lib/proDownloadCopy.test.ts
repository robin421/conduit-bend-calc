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

test('Calibrate My Bender 强调一次 90° 试弯匹配真实弯管器', () => {
  const copy = PRO_DOWNLOAD_COPY.GuidedCalibration;
  assert.equal(copy.title, 'Calibrate My Bender');
  assert.match(copy.value, /90° test bend/);
  assert.match(copy.value, /actual bender/);
});

test('Advanced Calibration 强调手动微调 gain / take-up', () => {
  const copy = PRO_DOWNLOAD_COPY.Calibration;
  assert.equal(copy.title, 'Advanced Calibration');
  assert.match(copy.value, /gain and take-up/);
});
