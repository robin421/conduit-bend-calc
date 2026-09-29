import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatLength,
  formatMeasurement,
  formatMetric,
  inchesToMm,
  mmToInches,
  parseLength,
  parseMetric,
  MM_PER_INCH,
} from './units.ts';

test('换算：英寸与毫米互转', () => {
  assert.equal(MM_PER_INCH, 25.4);
  assert.equal(inchesToMm(1), 25.4);
  assert.equal(mmToInches(25.4), 1);
});

test('parseMetric: mm / cm / m / 缺省 mm', () => {
  assert.ok(Math.abs((parseMetric('150 mm') ?? 0) - 150 / 25.4) < 1e-9);
  assert.ok(Math.abs((parseMetric('150mm') ?? 0) - 150 / 25.4) < 1e-9);
  assert.ok(Math.abs((parseMetric('150') ?? 0) - 150 / 25.4) < 1e-9);
  assert.ok(Math.abs((parseMetric('15 cm') ?? 0) - 150 / 25.4) < 1e-9);
  assert.ok(Math.abs((parseMetric('1.5 m') ?? 0) - 1500 / 25.4) < 1e-9);
});

test('parseMetric: 非法输入返回 null', () => {
  assert.equal(parseMetric('abc'), null);
  assert.equal(parseMetric('-5 mm'), null);
  assert.equal(parseMetric('5 in'), null);
  assert.equal(parseMetric(''), null);
});

test('parseLength: 按单位系统分派', () => {
  assert.equal(parseLength('2"', 'imperial'), 2);
  assert.ok(Math.abs((parseLength('50.8 mm', 'metric') ?? 0) - 2) < 1e-9);
});

test('formatMetric: 保留 1 位小数，整数不带小数', () => {
  assert.equal(formatMetric(2), '50.8 mm');
  assert.equal(formatMetric(100 / 25.4), '100 mm');
});

test('formatLength: imperial 走分数格式', () => {
  assert.equal(formatLength(27.5, 'imperial'), `2' 3-1/2"`);
  assert.equal(formatLength(1, 'metric'), '25.4 mm');
});

test('formatMeasurement: 拆成 value + unit', () => {
  assert.deepEqual(formatMeasurement(6, 'imperial'), { value: '6', unit: '"' });
  assert.deepEqual(formatMeasurement(1, 'metric'), { value: '25.4', unit: 'mm' });
});
