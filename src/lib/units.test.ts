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
  sanitizeInputForUnit,
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

test('parseLength: 按单位系统分派（fractional/decimal 走 parseImperial）', () => {
  assert.equal(parseLength('2"', 'fractional'), 2);
  assert.equal(parseLength('2-1/2"', 'fractional'), 2.5);
  assert.equal(parseLength('2.5"', 'decimal'), 2.5);
  assert.equal(parseLength(`2' 3-1/2"`, 'decimal'), 27.5);
  assert.ok(Math.abs((parseLength('50.8 mm', 'metric') ?? 0) - 2) < 1e-9);
});

test('formatMetric: 保留 1 位小数，整数不带小数', () => {
  assert.equal(formatMetric(2), '50.8 mm');
  assert.equal(formatMetric(100 / 25.4), '100 mm');
});

test('formatLength: fractional 走 ft-in-分数格式', () => {
  assert.equal(formatLength(27.5, 'fractional'), `2' 3-1/2"`);
  assert.equal(formatLength(6, 'fractional'), '6"');
  assert.equal(formatLength(0.5, 'fractional'), '1/2"');
  assert.equal(formatLength(12, 'fractional'), `1'`);
});

test('formatLength: decimal 走 2 位小数去尾零', () => {
  assert.equal(formatLength(12, 'decimal'), '12"');
  assert.equal(formatLength(1.5, 'decimal'), '1.5"');
  assert.equal(formatLength(2.625, 'decimal'), '2.63"');
  assert.equal(formatLength(2.6, 'decimal'), '2.6"');
});

test('formatLength: metric 走 mm', () => {
  assert.equal(formatLength(1, 'metric'), '25.4 mm');
});

test('formatMeasurement: 三态拆成 value + unit', () => {
  assert.deepEqual(formatMeasurement(27.5, 'fractional'), {
    value: `2' 3-1/2"`,
    unit: '',
  });
  assert.deepEqual(formatMeasurement(6, 'fractional'), { value: '6"', unit: '' });
  assert.deepEqual(formatMeasurement(1.5, 'decimal'), { value: '1.5', unit: '"' });
  assert.deepEqual(formatMeasurement(2.625, 'decimal'), { value: '2.63', unit: '"' });
  assert.deepEqual(formatMeasurement(1, 'metric'), { value: '25.4', unit: 'mm' });
});

test('sanitizeInputForUnit: 切换单位时去掉残留符号', () => {
  // 核心 bug 场景：6" 切 metric → 6
  assert.equal(sanitizeInputForUnit('6"', 'metric'), '6');
  assert.equal(sanitizeInputForUnit('6″', 'metric'), '6');
  assert.equal(sanitizeInputForUnit('150 mm', 'fractional'), '150');
  assert.equal(sanitizeInputForUnit('150mm', 'fractional'), '150');
  assert.equal(sanitizeInputForUnit('1.5 m', 'fractional'), '1.5');
  assert.equal(sanitizeInputForUnit(`2' 3-1/2"`, 'metric'), '');
  assert.equal(sanitizeInputForUnit(`2' 3-1/2"`, 'fractional'), `2' 3-1/2"`);
});

test('sanitizeInputForUnit: 无符号/已合法/空白输入原样保留', () => {
  assert.equal(sanitizeInputForUnit('6', 'metric'), '6');
  assert.equal(sanitizeInputForUnit('6', 'fractional'), '6');
  assert.equal(sanitizeInputForUnit('6"', 'fractional'), '6"');
  assert.equal(sanitizeInputForUnit('6"', 'decimal'), '6"');
  assert.equal(sanitizeInputForUnit('150 mm', 'metric'), '150 mm');
  assert.equal(sanitizeInputForUnit('', 'metric'), '');
  assert.equal(sanitizeInputForUnit('   ', 'fractional'), '   ');
});

test('sanitizeInputForUnit: 非法残留直接清空', () => {
  assert.equal(sanitizeInputForUnit('abc', 'metric'), '');
  assert.equal(sanitizeInputForUnit('2-1/2"', 'metric'), '');
  assert.equal(sanitizeInputForUnit('1 ft 2-1/2 in', 'metric'), '');
  assert.equal(sanitizeInputForUnit('1 ft 2-1/2 in', 'fractional'), '1 ft 2-1/2 in');
});
