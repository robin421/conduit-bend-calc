import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculateStub } from './stub.ts';

test('calculateStub: PRD AC2 目标 12" + take-up 5" → 标记点 7"', () => {
  const result = calculateStub(12, 5);
  assert.ok(result);
  assert.equal(result.markPoint, 7);
  assert.equal(result.takeUp, 5);
});

test('calculateStub: PRD 第 10 节各 EMT 规格 take-up', () => {
  assert.equal(calculateStub(12, 5)?.markPoint, 7);
  assert.equal(calculateStub(12, 6)?.markPoint, 6);
  assert.equal(calculateStub(12, 8)?.markPoint, 4);
});

test('calculateStub: 支持分数英寸目标高度', () => {
  assert.equal(calculateStub(27.5, 5)?.markPoint, 22.5);
});

test('calculateStub: 非法目标高度返回 null', () => {
  assert.equal(calculateStub(0, 5), null);
  assert.equal(calculateStub(-12, 5), null);
  assert.equal(calculateStub(Number.NaN, 5), null);
  assert.equal(calculateStub(Number.POSITIVE_INFINITY, 5), null);
});

test('calculateStub: 非法 take-up 返回 null', () => {
  assert.equal(calculateStub(12, 0), null);
  assert.equal(calculateStub(12, -5), null);
  assert.equal(calculateStub(12, Number.NaN), null);
});

test('calculateStub: take-up 不小于目标高度返回 null', () => {
  assert.equal(calculateStub(5, 5), null);
  assert.equal(calculateStub(4, 5), null);
});
