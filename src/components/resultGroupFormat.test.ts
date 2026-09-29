import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatResultUnit } from './resultGroupFormat.ts';

test('formatResultUnit: 数值与单位之间保留一个空格（Metric 显示 "37.5 mm"）', () => {
  assert.equal(formatResultUnit('mm'), ' mm');
  assert.equal(formatResultUnit('"'), ' "');
  assert.equal(`37.5${formatResultUnit('mm')}`, '37.5 mm');
});

test('formatResultUnit: 空单位 / undefined 返回空串', () => {
  assert.equal(formatResultUnit(undefined), '');
  assert.equal(formatResultUnit(''), '');
});
