import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatImperial, parseImperial } from './imperial.ts';

test('parseImperial: ft-in-fraction 组合', () => {
  assert.equal(parseImperial('2\' 3-1/2"'), 27.5);
});

test('parseImperial: 纯英寸', () => {
  assert.equal(parseImperial('6"'), 6);
});

test('parseImperial: 纯分数英寸', () => {
  assert.equal(parseImperial('1/2"'), 0.5);
});

test('parseImperial: 其它合法格式', () => {
  assert.equal(parseImperial("2'"), 24);
  assert.equal(parseImperial("2' 3\""), 27);
  assert.equal(parseImperial("2'3-1/2\""), 27.5);
  assert.equal(parseImperial('3-1/2"'), 3.5);
  assert.equal(parseImperial('3 1/2"'), 3.5);
  assert.equal(parseImperial('3.5"'), 3.5);
  assert.equal(parseImperial('2 ft 3.5 in'), 27.5);
});

test('parseImperial: 非法输入返回 null', () => {
  assert.equal(parseImperial('abc'), null);
  assert.equal(parseImperial(''), null);
  assert.equal(parseImperial('   '), null);
  assert.equal(parseImperial('-6"'), null);
  assert.equal(parseImperial('1/0"'), null);
  assert.equal(parseImperial('2\' 3" 4"'), null);
});

test('formatImperial: 输出 ft-in-fraction', () => {
  assert.equal(formatImperial(27.5), '2\' 3-1/2"');
  assert.equal(formatImperial(6), '6"');
  assert.equal(formatImperial(0.5), '1/2"');
  assert.equal(formatImperial(12), "1'");
  assert.equal(formatImperial(27), '2\' 3"');
  assert.equal(formatImperial(0), '0"');
});

test('parseImperial 与 formatImperial 往返一致', () => {
  for (const value of [0.5, 6, 12, 27, 27.5, 48.25, 36.75]) {
    assert.equal(parseImperial(formatImperial(value)), value);
  }
});
